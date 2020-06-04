/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { Message, TextChannel } from 'discord.js';
import { randomBytes } from 'crypto';
import fetch from 'node-fetch';

export async function postHaste(code: string, lang?: string): Promise<string> {
	try {
		if (code.length > 400000) {
			return 'Document exceeds maximum length.';
		}
		const res = await fetch('https://paste.nomsy.net/documents', { method: 'POST', body: code });
		const { key, message } = await res.json();
		if (!key) {
			return message;
		}
		return `https://paste.nomsy.net/${key}${lang && `.${lang}`}`;
	} catch (err) {
		throw err;
	}
}

export async function fetchMessagesRecurisive(channel: TextChannel, after?: string): Promise<Message[]> {
	const opts = { limit: 100, after };
	const messages = await channel.messages.fetch(opts);
	if (!messages.size) return [];

	const { id } = messages.last()!;
	const next = await fetchMessagesRecurisive(channel, id);
	return messages.array().concat(next);
}

export function codeb(data: any, lang?: string) {
	const bt = '`';
	return lang ? `${bt.repeat(3)}${lang}\n${data}${bt.repeat(3)}` : `${bt}${data}${bt}`;
}

export function smartChunk(data: string[], maxPerChunk: number, join = ''): string[][] {
	let buffer: string[] = [];
	const fragments: string[][] = [];
	for (const content of data) {
		if (content.length + buffer.length + join.length <= maxPerChunk) buffer.push(content);
		else {
			fragments.push(buffer);
			buffer = [];
		}
	}
	if (buffer.length) fragments.push(buffer);
	return fragments;
}

export function pluralize(number: number, suffix = 's'): string {
	if (number === 1) return '';
	return suffix;
}

export function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function localize(number: number, locale = 'en-US'): string {
	try {
		return new Intl.NumberFormat(locale).format(number);
	} catch {}
	return new Intl.NumberFormat('en-US').format(number);
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function uuid(): string {
	const id = randomBytes(32).toString('hex');
	return (Array(32).join('0') + id).slice(-32).replace(/^.{8}|.{4}(?!$)/g, '$&-');
}
