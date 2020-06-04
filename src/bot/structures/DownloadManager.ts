import ImgDlClient from '../client/ImgDlClient';
import { Amqp } from '@spectacles/brokers';
import Download from './Download';
import { ordinal } from '../util';

// interface BaseData {
// 	id: string;
// }

// interface InitData extends BaseData {
// 	images: string[];
// }

// interface CompleteData extends BaseData {
// 	url: string;
// }

// type BrokerEvents = 'INIT' | 'COMPLETE' | string;

export default class DownloadManager {
	public readonly broker: Amqp = new Amqp('downloader');

	public readonly queue: Download[] = [];

	private processing = false;

	protected readonly client: ImgDlClient;

	public constructor(client: ImgDlClient) {
		this.client = client;
	}

	public async add(download: Download): Promise<void> {
		this.queue.push(download);
		if (!this.processing) await this._run();
	}

	private async _run() {
		this.processing = true;
		const toRun = this.queue.shift();

		if (toRun) {
			for (const [i, queued] of this.queue.entries())
				queued.msg.reply(`Your download is in the queue! You're ${ordinal(i + 1)} in line.`);
			try {
				await toRun.start();
			} catch {}
			await this._run();
		} else {
			this.processing = false;
		}
	}

	// future implementation with a download worker
	// private async _handleInit(data: InitData): Promise<void> {
	// 	this.client.logger.debug(`[AMQP] [INIT]: Downloading service acknowledged initialize payload ${data.id}`);
	// }

	// private async _handleComplete(data: CompleteData): Promise<void> {}

	// public async init(): Promise<void> {
	// 	this.broker.on('error', (err: any) => this.client.logger.error(`[AMQP]: ${err}`, err));
	// 	this.broker.connect(process.env.AMQP_URL);

	// 	this.broker.subscribe(
	// 		['INIT', 'COMPLETE'],
	// 		async (event: BrokerEvents, data: any): Promise<void> => {
	// 			if (event === 'INIT') return this._handleInit(data as InitData);
	// 			if (event === 'COMPLETE') return this._handleComplete(data as CompleteData);
	// 		},
	// 	);
	// }
}
