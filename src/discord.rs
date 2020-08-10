use reqwest::blocking::Client;
use rustacles_model::User;

pub fn me(token: &str) -> Option<User> {
    let client = Client::new();

    let res = client
        .get("https://discord.com/api/users/@me")
        .header("Authorization", format!("Bot {}", token))
        .send();

    let res = match res {
        Ok(res) => res,
        Err(_) => return None,
    };

    let json: Result<User, _> = res.json();
    match json {
        Ok(json) => return Some(json),
        Err(_) => return None,
    }
}

pub fn validate_token(token: String) -> Result<(), String> {
    let me = me(&token);
    match me {
        Some(_) => Ok(()),
        _ => Err(String::from("Please provide a valid Discord bot token!")),
    }
}

pub fn deob_token(token: &str) -> String {
    let split: Vec<&str> = token.split(".").collect();
    return format!("{}.{}.{}", split[0], censor(split[1]), censor(split[2]));
}

pub fn censor(content: &str) -> String {
    return "*".repeat(content.len());
}
