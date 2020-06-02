# Discord Bot Template
This Discord bot template uses the following technologies:
* [PNPM](https://pnpm.js.org/) (package manager)
* [Docker](https://docker.com/) (secure, isolated container)
* [MongoDB](https://mongodb.com/) (noSQL database)
* [Discord.js](https://discord.js.org/) (Discord API interaction)
* [Discord Akairo](https://discord-akairo.github.io/) (Discord bot command handler)
* [Discord.js/collection](https://github.com/discordjs/collection) (database caching)

## Preamble
This project uses [pnpm](https://pnpm.js.org) in place of npm or yarn to install dependencies.
I would strongly reccomend you switch to pnpm for all your projects, big and small.
> pnpm uses hard links and symlinks to save one version of a module only ever once on a disk. When using npm or Yarn for example, if you have 100 projects using the same version of lodash, you will have 100 copies of lodash on disk. With pnpm, lodash will be saved in a single place on the disk and a hard link will put it into the node_modules where it should be installed.
> 
> As a result, you save gigabytes of space on your disk and you have a lot faster installations! If you'd like more details about the unique node_modules structure that pnpm creates and why it works fine with the Node.js ecosystem, read this small article: Flat node_modules is not the only way.

## Usage
1. Install dependencies  with `pnpm install`
2. Rename `.env.example` to `.env` and set each value accordingly
3. Update lines 3-7 in the [Dockerfile](https://github.com/Fyko/bot-template/blob/master/Dockerfile#L3-L7)
4. Build app with `pnpm run  build`
5. Start app with `node .`
> you can  also build & start with `pnpm start`
