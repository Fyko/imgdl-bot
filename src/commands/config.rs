use crate::config::{config_path, create_config, Config};
use crate::discord::deob_token;
use clap::ArgMatches;
use std::fs;

pub fn run(matches: &ArgMatches) {
    match matches.subcommand() {
        ("destroy", _) => {
            destroy();
        }
        ("init", _) => {
            init();
        }
        ("set", Some(set_matches)) => {
            set(set_matches);
        }
        _ => unreachable!(),
    }
}

fn destroy() {
    let file_path = config_path();
    let meta = fs::metadata(&file_path);
    match meta {
        Ok(_) => {
            let _ = fs::remove_file(&file_path);
            info!("Successfully deleted the configuration file!");
        }
        Err(_) => error!("A configuration file does not exist!"),
    }
}

fn set(matches: &ArgMatches) {
    match matches.subcommand() {
        ("token", Some(token_matches)) => {
            let file_path = config_path();
            let meta = fs::metadata(&file_path);

            let token = token_matches.value_of("token").unwrap_or("");
            let data = Config {
                token: token.into(),
            };
            let toml = toml::to_string(&data).unwrap();

            if meta.is_ok() {
                let res = fs::write(&file_path, &toml);
                match res {
                    Ok(_) => info!(
                        "Successfully set the default token to {}",
                        deob_token(&token)
                    ),
                    Err(err) => error!(
                        "An error occurred when trying to update the configuration: {}",
                        err
                    ),
                }
            } else {
                let res = create_config(&toml);
                match res {
                    Ok(_) => info!(
                        "Successfully set the default token to {}",
                        deob_token(&token)
                    ),
                    Err(err) => error!("{}", err),
                }
            }
        }
        _ => unreachable!(),
    }
}

fn init() {
    let res = create_config("");
    match res {
        Ok(d) => info!("{}", d),
        Err(err) => error!("{}", err),
    }
}
