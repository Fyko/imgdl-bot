import archiver from 'archiver';
import S3 from 'aws-sdk/clients/s3';
import { stripIndents } from 'common-tags';
import { Message, MessageAttachment, SnowflakeUtil, TextChannel, Util } from 'discord.js';
import { createReadStream, createWriteStream, promises } from 'fs';
import fetch from 'node-fetch';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import ImgDlClient from '../client/ImgDlClient';
import { codeb, formatBytes, localize, uuid } from '../util';

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;

const pipelineP = promisify(pipeline);

export default class Download {
	protected readonly client: ImgDlClient;

	public readonly msg: Message;

	protected readonly channel: TextChannel;

	protected readonly oldest?: string;

	private readonly IMAGE_EXTENSIONS = ['.png', '.gif', '.jpg', '.jpeg'];

	private readonly debug = process.env.NODE_ENV !== 'prod';

	public constructor(client: ImgDlClient, msg: Message, channel: TextChannel, oldest?: string) {
		this.client = client;
		this.msg = msg;
		this.channel = channel;
		this.oldest = oldest;
	}

	private async fetchMessagesRecurisive(channel: TextChannel, before?: string, oldest?: string): Promise<Message[]> {
		const opts = { limit: 100, before };
		const messages = await channel.messages.fetch(opts);
		if (this.debug) this.client.logger.verbose(`[FetchMsgsR]: Fetched ${messages.size} messages`);
		if (!messages.size) return [];
		if (oldest) {
			const { timestamp } = SnowflakeUtil.deconstruct(oldest);
			if (messages.some(m => m.createdTimestamp < timestamp))
				return messages.array().filter(m => m.createdTimestamp > timestamp);
		}

		const { id } = messages.last()!;
		const next = await this.fetchMessagesRecurisive(channel, id, oldest);
		return messages.array().concat(next);
	}

	private gatherImages(messages: Message[]): MessageAttachment[] {
		const attachments: MessageAttachment[] = [];

		for (const message of messages.values()) {
			for (const attachment of message.attachments.values()) {
				if (attachment.width && attachment.height && this.IMAGE_EXTENSIONS.includes(extname(attachment.url))) {
					attachments.push(attachment);
				}
			}
		}

		return attachments;
	}

	public async start(): Promise<Message | Message[] | void> {
		await this.msg.reply('your download is starting!');

		const m = await this.msg.channel.send('Fetching messages... (this may take a while)');

		const messages = await this.fetchMessagesRecurisive(this.channel, undefined, this.oldest);

		if (this.debug) this.client.logger.verbose(`Fetched ${messages.length} messages`);
		await m.edit(`Successfully fetched ${localize(messages.length)} messages, filtering images...`);

		const images = this.gatherImages(messages);

		if (this.debug) this.client.logger.verbose(`Gathered ${images.length} images`);
		if (!images.length) return m.edit(`Gathered ${codeb(images.length)} images - process aborted.`);

		const memoryInterval = setInterval(() => {
			const memory = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`;
			if (this.debug) this.client.logger.debug(`[Memory Usage]: ${memory}`);
		}, 4500);

		const bytes = images.reduce((acc, val) => (acc += val.size), 0);
		const size = formatBytes(bytes);

		if (this.debug) this.client.logger.verbose(`Images size: ${size} | ${bytes}`);

		const id = uuid();
		const dir = join(tmpdir(), id);

		await promises.mkdir(dir);

		const ziplocation = join(dir, `${id}.zip`);
		const output = createWriteStream(ziplocation);
		const archive = archiver('zip');
		archive.on('error', this.client.logger.error);
		archive.pipe(output);

		await m.edit(`Gathered ${codeb(localize(images.length))} images totaling ${codeb(size)} downloading...`);

		// download all the images
		await new Promise(async resolve => {
			let current = 0;
			// editing the message every 10 seconds with the image download status
			const interval = setInterval(() => {
				m.edit(
					`Downloading images... (${codeb(`${localize(current)}/${localize(images.length)}`)} | ${codeb(
						`${((current / images.length) * 100).toFixed(2)}%`,
					)})`,
				);
			}, 1000 * 10);

			for (const image of images) {
				current++;

				// consistently dies after 50 images, take a break?
				if (current % 50 === 0) {
					if (this.debug) this.client.logger.debug(`Taking a little break...`);
					await Util.delayFor(3000);
				}

				const response = await fetch(image.url);
				if (this.debug)
					this.client.logger.verbose(`[${response.status}] Downloaded Image #${current}/${images.length}`);

				if (response.ok) {
					const ext = extname(image.url);
					const stream = createWriteStream(join(dir, `${current}${ext}`));
					await pipelineP(response.body, stream);
					stream.destroy(); // DESTROY ME DADDY
				}
			}

			this.client.clearInterval(interval);

			resolve();
		});

		await m.edit(`Successfully downloaded all ${codeb(images.length)} images! Zipping...`);

		const files = await promises.readdir(dir);

		// filter out the zip file since it'll be in the same folder :megu:
		const filteredFiles = files.filter(f => extname(f) !== '.zip');
		for (const [index, file] of filteredFiles.entries()) {
			const ext = extname(file);
			const stream = createReadStream(join(dir, file));
			archive.append(stream, { name: `${index}${ext}` });
			if (this.debug) this.client.logger.verbose(`Appended image ${index}/${images.length} to the archive`);
		}

		// zip the folder
		await new Promise(async resolve => {
			let last: archiver.ProgressData;
			const interval = setInterval(() => {
				const percent = 100 - ((bytes - last.fs.processedBytes) / bytes) * 100;
				m.edit(`Zipping folder... (${codeb(`${percent.toFixed(2)}%`)})`);
			}, 1000 * 5);

			archive.on('progress', progress => {
				last = progress;
				if (this.debug) this.client.logger.verbose(`Archive Progress: ${JSON.stringify(progress.entries)}`);
			});

			await archive.finalize();

			clearInterval(interval);
			resolve();
		});

		if (this.debug) this.client.logger.verbose(`Done zipping!`);

		await m.edit(`Successfully zipped the file, uploading...`);

		// we can handle this locally if the zipped file can be uploaded to Discord
		if (bytes < 8e6) {
			return this.msg.channel.send({
				files: [
					{
						attachment: ziplocation,
						name: `${id}.zip`,
					},
				],
			});
		}

		// uploading to AWS
		const upload = await new Promise<S3.ManagedUpload.SendData>(async (resolve, reject) => {
			let last: S3.ManagedUpload.Progress;
			const interval = setInterval(() => {
				const percent = ((last.loaded / last.total) * 100).toFixed(2);
				m.edit(`Uploading to AWS... (${codeb(`${percent}%`)})`);
			}, 1000 * 5);

			const stream = createReadStream(ziplocation);

			const params: S3.PutObjectRequest = {
				Bucket: process.env.AWS_S3_BUCKET!,
				Body: stream,
				Key: `uploads/${id}/${id}.zip`,
				ACL: 'public-read',
				Expires: new Date(Date.now() + HOUR * 72),
			};

			this.client.s3
				.upload(params, (error, data) => {
					stream.destroy();
					clearInterval(interval);

					if (error) reject(error);
					resolve(data);
				})
				.on('httpUploadProgress', progress => {
					last = progress;
					if (this.debug)
						this.client.logger.debug(`[AWS STATUS]: ${((progress.loaded / progress.total) * 100).toFixed(2)}`);
				});
		});

		console.dir('S3 Response: ', upload);

		// clear the memory log
		clearInterval(memoryInterval);

		// sometimes, if the file is "too small" the S3 responds will be empty so :/
		// if (typeof upload.Location !== 'string') {
		// 	return this.msg.util?.send(`An error occurred when trying to upload the file to Amazon S3: \`${upload}\`.`);
		// }
		const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/uploads/${id}/${id}.zip`;

		return this.msg.util?.send(stripIndents`
			Your download is available!

			Download URL: <${s3Url}>

			In 72 hours, the download link will be invalided and the data will be deleted.
		`);
	}
}
