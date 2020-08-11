#[macro_use]
extern crate serde_derive;

#[macro_use]
extern crate log;

#[macro_use]
extern crate clap;

use crate::discord::validate_token;
use clap::{App, Arg};
use env_logger::Env;
use indicatif::{ProgressBar, ProgressStyle};
use std::{
    fs::{create_dir, File},
    io, thread, time,
};

mod commands;
mod config;
mod discord;
mod util;

fn main() {
    env_logger::from_env(Env::default().default_filter_or("info")).init();
    let _ = util::check_version();
    let version = crate_version!();

    let matches = App::new("imgdl")
        .about("a cli app to recursively download images from a Discord channel")
        .version(version)
        .author(crate_authors!())
        .arg(Arg::with_name("channel"))
        .arg(Arg::with_name("oldest"))
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

    

    if matches.is_present("channel") {
        let config = config::read_config();
        if config.is_none() {
            return error!("There is no configured Discord bot token! Please set one with 'imgdl config set token token_here'");
        }
        let channel = matches.value_of("channel").unwrap();
        let oldest = matches.value_of("oldest");
        let images = discord::fetch_images(&config.unwrap().token, channel, oldest);
        let length: u64 = images.len().to_string().parse::<u64>().unwrap();
        if length == 0 {
            return ();
        }
        let dir = config::config_dir();

        let now = time::SystemTime::now()
            .duration_since(time::UNIX_EPOCH)
            .unwrap();
        let folder_name = hex::encode(now.as_millis().to_string());
        let folder = format!("{}/{}", dir, folder_name);
        let _ = create_dir(&folder);

        let pb = ProgressBar::new(length);

        pb.set_style(ProgressStyle::default_bar().template(
            "[{elapsed_precise}] {bar:40.cyan/blue} {pos}/{len} images downloaded (eta: {eta})",
        ));

        for image in images.iter() {
            let index = images
                .iter()
                .position(|img| img.id.to_string() == image.id.to_string())
                .unwrap();
            if index % 50 == 0 && index != 0 {
                // warn!("Taking a 5 second break to avoid a Discord ban...");
                thread::sleep(time::Duration::from_secs(5));
            }
            let res = reqwest::blocking::get(&image.url);
            let extension = util::file_extension(&image.url);
            let path = format!("{}/{}.{}", &folder, index, extension.unwrap_or("png"));
            let mut output = File::create(&path).unwrap();

            let write = io::copy(&mut res.unwrap().text().unwrap().as_bytes(), &mut output);
            match write {
                Ok(_) => {
                    pb.inc(1);
                }
                Err(err) => panic!(
                    "An error occurred when trying to download an image: {}",
                    err
                ),
            }
        }
        pb.finish();

        info!("Successfully downloaded {} images to {}", length, &folder);

        return ();
    }

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
