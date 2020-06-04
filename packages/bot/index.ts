import { Amqp } from '@spectacles/brokers';
import REST, { RedisMutex, Request } from '@spectacles/rest';
import { inspect } from 'util';
import {
	Dispatch,
	GuildCreate,
	ChannelCreate,
	GuildUpdate,
	GuildDelete,
	ChannelUpdate,
	ChannelDelete,
	MessageCreate,
	ChannelType,
	User,
} from '@spectacles/types';
import Redis from 'ioredis';
import { logger } from './util/logger';
import { handleMessage } from './util';

const events = [
	Dispatch.GUILD_CREATE,
	Dispatch.GUILD_UPDATE,
	Dispatch.GUILD_DELETE,
	Dispatch.CHANNEL_CREATE,
	Dispatch.CHANNEL_UPDATE,
	Dispatch.CHANNEL_DELETE,
	Dispatch.MESSAGE_CREATE,
];

export const redis = new Redis('redis');

export const rest = new REST(process.env.DISCORD_TOKEN!, {
	mutex: new RedisMutex(redis, `${process.pid}`),
});

rest.on('retry', console.log);
rest.on('request', (req: Request) => logger.debug(`[REQUESTING]: ${req.endpoint}`));
rest.on('response', (...args) => console.log(new Date(), inspect(args, { depth: 1 })));

const gateway = new Amqp('gateway');
gateway.on('error', logger.error);

async function start() {
	const me: User = await rest.get('/users/@me');

	try {
		logger.debug(`[GATEWAY] [${me.username}#${me.discriminator}]: Connecting to the gateway...`);
		await gateway.connect('fyko:simba@rabbit');
	} catch {}

	gateway.subscribe(events, (event: string, data: any) => {
		if (event === Dispatch.GUILD_CREATE) {
			return redis.set(`guild.${(data as GuildCreate).id}`, data);
		}
		if (event === Dispatch.GUILD_UPDATE) {
			return redis.set(`guild.${(data as GuildUpdate).id}`, data);
		}
		if (event === Dispatch.GUILD_DELETE) {
			return redis.del(`guild.${(data as GuildDelete).id}`, data);
		}

		if (event === Dispatch.CHANNEL_CREATE) {
			if ((data as ChannelCreate).type === ChannelType.GUILD_TEXT) return redis.set(`channel.${(data as ChannelCreate).id}`, data);
		}
		if (event === Dispatch.CHANNEL_UPDATE) {
			if ((data as ChannelCreate).type === ChannelType.GUILD_TEXT) return redis.set(`channel.${(data as ChannelUpdate).id}`, data);
		}
		if (event === Dispatch.CHANNEL_DELETE) {
			if ((data as ChannelCreate).type === ChannelType.GUILD_TEXT) return redis.del(`channel.${(data as ChannelDelete).id}`, data);
		}

		if (event === Dispatch.MESSAGE_CREATE) {
			const message = data as MessageCreate;
			return handleMessage(message);
		}
	});

	return logger.info(`[GATEWAY] [${me.username}#${me.discriminator}]: Successfully connected to the gateway.`);
}

start();
