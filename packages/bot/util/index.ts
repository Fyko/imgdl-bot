import { Message, Channel, GuildMember, Guild } from '@spectacles/types';
import { Permissions } from '@spectacles/util';
import { redis, rest } from '../';
import { logger } from './logger';

const prefix = 'dl!';

export async function handleMessage(msg: Message): Promise<void> {
	if (msg.author.bot) return;
	if (!msg.guild_id) return;
	if (!msg.content.trim().startsWith(prefix)) return;

	const args = msg.content.trim().slice(prefix.length).split(/\s+/g);
	const command = args.shift()?.toLowerCase();

	if (command === 'download') {
		const guild = await fetchGuild(msg.guild_id);
		if (!guild) return;

		const member = await fetchMember(msg.guild_id, msg.author.id);
		if (!member) return;

		const permissions = new Permissions()
		permissions.apply({ guild, member });

		if (!permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {
			return rest.post(`/channels/${msg.channel_id}/messages`, { content: `<@${msg.author.id}>, you're missing the \`Manage Messages\` permissions to run that command.` });
		}

		const m: Message = await rest.post(`/channels/${msg.channel_id}/messages`, { content: 'Fetching messages...' });

		const messages = await fetchMessagesRecursive(msg.channel_id);

		return rest.patch(`/channels/${m.channel_id}/messages/${m.id}`, { content: `Fetched ${messages.length} messages!` })
	}
}

export async function fetchMember(guildId: string, userId: string): Promise<GuildMember | null> {
	try {
		const response = await rest.get(`/guilds/${guildId}/members/${userId}`);
		return response as GuildMember;
	} catch {}

	return null;
}

export async function fetchGuild(guildId: string): Promise<Guild | null> {
	// try fetching from redis first
	const cached = await redis.get(`guild.${guildId}`);
	if (cached) {
		try {
			return JSON.parse(cached) as Guild;
		} catch {}
	}

	// hit the API for the guild
	try {
		const response = await rest.get(`/guilds/${guildId}`);
		return response as Guild;
	} catch {}

	return null;
}

export async function parseChannel(str: string): Promise<Channel | null> {
	// try fetching from redis before moving on
	const cached = await redis.get(`channel.${str}`);
	if (cached) {
		try {
			return JSON.parse(cached) as Channel;
		} catch {}
	}

	const reg = /<#(\d{17,19})>/;
	const match = str.match(reg);
	if (match && match[1]) {
		const [, id] = match;
		// try fetching it from redis before hitting the API
		const cached = await redis.get(`channel.${id}`);
		if (cached) {
			try {
				return JSON.parse(cached) as Channel;
			} catch {}
		}
		
		// now we hit the API, if this fails we return null
		try {
			const response: Channel = await rest.get(`/channels/${id}`);
			return response;
		} catch {}
	}

	return null;
}

export async function fetchMessagesRecursive(channelId: string, after?: string): Promise<Message[]> {
	logger.debug('[FMR]: Within fetch messages recursive function');
	const query = new URLSearchParams();
	query.set('limit', '100');
	if (after) query.set('after', after);
	logger.debug(`[FMR]: Query: ${query}`);

	const messages: Message[] = await rest.get(`/channels/${channelId}/messages?${query}`);
	logger.debug(`[FMR]: Fetched ${messages.length} messages.`);

	if (!messages.length) return [];

	const { id } = messages[messages.length - 1];
	const next = await fetchMessagesRecursive(channelId, id);
	const value = messages.concat(next);
	logger.debug(`[FMR]: Returning ${value.length} messages...`);

	return messages.concat(next);
}