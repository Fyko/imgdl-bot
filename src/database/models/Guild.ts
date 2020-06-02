import { Document, Schema, model } from 'mongoose';

export interface Guild extends Document {
	id: string;
	prefix: string;
}

const Guild: Schema = new Schema(
	{
		id: {
			type: String,
			required: true,
		},
		prefix: {
			type: String,
			default: process.env.PREFIX,
		},
	},
	{
		strict: false,
	},
);

export default model<Guild>('Guild', Guild);
