import { stripIndents } from 'common-tags';
import { Message, Permissions, TextChannel } from 'discord.js';
import MissingPermissionsListener from '../../listeners/commandHandler/missingPermissions';
import Download from '../../structures/Download';
import ImgDlCommand from '../../structures/ImgDlCommand';
import { ordinal } from '../../util';

export default class extends ImgDlCommand {
	public constructor() {
		super('download', {
			category: 'system',
			aliases: ['download', 'dl', 'imgdl'],
			description: {
				content: stripIndents`
					Recursively fetches images and downloads images from the provided channel.

					You have the option to provide the Id of the oldest message you'd like to fetch.
					Only messages after the message Id provided will be included in the final download.
					__Providing no Id for this parameter will download all images from the channel.__

					Once downloaded, all the images will be zipped. If the file is under 8Mb, it will be uploaded directly to Discord.

					Else, it will be uploaded to [Amazon S3](https://aws.amazon.com/s3/) and can be downloaded via a URL.
					After 72 hours, the download URL will be invalidated.
				`,
				usage: '<channel> [oldest message Id]',
				examples: ['#success', '#success 717934988611551232'],
			},
			cooldown: 300,
			userPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
			args: [
				{
					id: 'channel',
					type: 'textChannel',
					prompt: {
						start: 'which channel would you like to download the images from?',
						retry: "please provide a valid text channel that you'd like to download images from.",
					},
				},
				{
					id: 'after',
					type: 'string',
					prompt: {
						start: "what is the Id of the oldest message you'd like to fetch?",
						retry: "please provide the Id of the oldest message you'd like to fetch.",
						optional: true,
					},
					default: undefined,
				},
			],
		});
	}

	public async exec(
		msg: Message,
		{ channel, after }: { channel: TextChannel; after?: string },
	): Promise<Message | Message[] | void> {
		// permissions check for the client in the channel
		if (
			!channel
				.permissionsFor(this.client.user!)
				?.has([Permissions.FLAGS.READ_MESSAGE_HISTORY, Permissions.FLAGS.VIEW_CHANNEL])
		) {
			const missing = MissingPermissionsListener.missingPermissions(channel, this.client.user!, [
				Permissions.FLAGS.READ_MESSAGE_HISTORY,
				Permissions.FLAGS.VIEW_CHANNEL,
			]);
			return msg.util?.reply(`I'm missing ${missing} in ${channel}.`);
		}

		// permissions check for the executor in the channel
		if (
			!channel.permissionsFor(msg.author)?.has([Permissions.FLAGS.READ_MESSAGE_HISTORY, Permissions.FLAGS.VIEW_CHANNEL])
		) {
			const missing = MissingPermissionsListener.missingPermissions(channel, msg.author, [
				Permissions.FLAGS.READ_MESSAGE_HISTORY,
				Permissions.FLAGS.VIEW_CHANNEL,
			]);
			return msg.util?.reply(`you're missing ${missing} in ${channel}.`);
		}

		// download class & queue since we can't download more than 50 images without taking a break
		const download = new Download(this.client, msg, channel, after);

		const queueLength = this.client.downloadManager.queue.length;

		await msg.reply(`your download has been queued! You're ${ordinal(queueLength + 1)} in line.`);

		this.client.downloadManager.add(download);
	}
}
