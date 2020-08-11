use crate::config::read_config;
use crate::discord::me;

pub fn run() {
    let config = read_config();
    if config.is_none() {
        return error!("There is no configured Discord bot token! Please set one with 'imgdl config set token token_here'");
    }
    let user = me(&config.unwrap().token);
    if user.is_none() {
        return error!("An unknown error occurred when trying to fetch the user");
    }
    let user = user.unwrap();

    info!(
        "{}#{} ({}) is the currently configured Discord bot",
        user.username, user.discriminator, user.id
    );
}
