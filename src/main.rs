#[macro_use]
extern crate log;

#[macro_use]
extern crate serde_derive;

use crate::discord::validate_token;
use clap::{App, Arg};
use env_logger::Env;

mod commands;
mod config;
mod discord;

fn main() {
    env_logger::from_env(Env::default().default_filter_or("info")).init();

    let matches = App::new("imgdl")
        .about("a cli app to recursively download images from a Discord channel ")
        .subcommand(
            App::new("config")
                .about("manages the configuration")
                .subcommand(App::new("destroy").about("destroys the configuration file"))
                .subcommand(App::new("init").about("creates a configuration file"))
                .subcommand(
                    App::new("set")
                        .about("sets a value in the config")
                        .subcommand(
                            App::new("token").arg(
                                Arg::with_name("token")
                                    .required(true)
                                    .validator(validate_token),
                            ),
                        ),
                ),
        )
        .subcommand(App::new("whoami").about("returns info on the configured Discord token"))
        .get_matches();

    match matches.subcommand() {
        ("config", Some(matches)) => {
            commands::config::run(matches);
        }
        ("whoami", _) => {
            commands::whoami::run();
        }
        _ => unreachable!(),
    }
}
