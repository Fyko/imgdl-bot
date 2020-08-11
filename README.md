# ☁ imgdl cli
[![Actions](https://img.shields.io/github/workflow/status/fyko/imgdl-bot/imgdl?style=flat)](https://github.com/Fyko/imgdl/actions)
[![Crate](https://img.shields.io/crates/v/imgdl.svg?style=flat)](https://crates.io/crates/imgdl)
[![Downloads](https://img.shields.io/crates/d/imgdl.svg?style=flat)](https://crates.io/crates/imgdl)

a cli app to recursively download images from a Discord channel 

## installing
```sh
# make sure you have the rust toolchain installed
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# development: cargo install --git https://github.com/fyko/imgdl-bot --branch cli
cargo install imgdl
```
## updating
```sh
cargo install imgdl
```

## setup
```sh
# https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot
# take the token from your bot application and put it in "token_here" below
# eg: imgdl config set token NzA3OTk1NjY1NjYxMTY1NTY4.XrQ6WA.Vgc2FNkBKbsCu4Mq3pqj3Nj2Bp4
imgdl config set token token_here
```

## usage
```sh
# now you can start downloading images!
# download the whole channel
imgdl 552210716036300810 

# download all messages after the message Id provided
imgdl 552210716036300810 742608474751500299 
```