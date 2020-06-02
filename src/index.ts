import Client from './bot';

new Client({
	token: process.env.TOKEN!,
	owners: process.env.OWNERS!.split(','),
	color: process.env.COLOR!,
	prefix: process.env.PREFIX!,
}).launch();
