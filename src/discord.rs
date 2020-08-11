use chrono::{DateTime, FixedOffset, NaiveDateTime};
use indicatif::{ProgressBar, ProgressStyle};
use reqwest::blocking::Client;
use spectacles_model::{
    message::{Message, MessageAttachment},
    User,
};
use std::collections::HashMap;

// https://github.com/serenity-rs/serenity/blob/current/src/model/id.rs#L14
// ISC License (ISC) Copyright (c) 2016, Zeyla Hellyer hi@zeyla.me
fn snowflake_timestamp(snowflake: &str) -> DateTime<FixedOffset> {
    let snowflake = snowflake.parse::<u64>().unwrap();
    let offset = snowflake >> 22;
    let secs = offset / 1000;
    let millis = (offset % 1000) * 1_000_000; // 1 million nanoseconds in a millisecond

    let tm = NaiveDateTime::from_timestamp(1_420_070_400 + secs as i64, millis as u32);
    DateTime::from_utc(tm, FixedOffset::east(0))
}

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

fn fetch_messages(
    token: &str,
    channel: &str,
    before: Option<String>,
    oldest: Option<&str>,
) -> Vec<Message> {
    let client = reqwest::blocking::Client::new();

    let token = format!("Bot {}", token);
    let uri = format!("https://discord.com/api/channels/{}/messages", channel);

    let mut query: HashMap<&str, String> = HashMap::new();
    query.insert("limit", "100".into());
    if before.is_some() {
        query.insert("before", before.unwrap());
    }

    let request = client
        .get(&uri)
        .query(&query)
        .header("Authorization", token);

    let res = match request.send() {
        Ok(res) => res,
        Err(why) => {
            panic!("Error fetching messages: {} {}", why, uri);
        }
    };

    let mut json: Vec<Message> = match res.json() {
        Ok(msgs) => msgs,
        Err(why) => {
            panic!("Error parsing fetched messages: {}", why);
        }
    };

    if oldest.is_some() {
        let oldest_created_at = snowflake_timestamp(oldest.unwrap());
        if json
            .clone()
            .into_iter()
            .filter(|m| snowflake_timestamp(&m.id.to_string()) < oldest_created_at)
            .count()
            >= 1
        {
            json = json
                .into_iter()
                .filter(|m| snowflake_timestamp(&m.id.to_string()) > oldest_created_at)
                .collect();
        }
    }

    return json;
}

pub fn fetch_images<'a>(
    token: &'a str,
    channel: &'a str,
    oldest: Option<&'a str>,
) -> Vec<MessageAttachment> {
    let mut messages: Vec<Message> = vec![];
    let mut before: Option<String> = None;

    let pb = ProgressBar::new_spinner();
    pb.enable_steady_tick(80);
    pb.set_style(
        ProgressStyle::default_spinner()
            .tick_strings(&[
                "[    ]", "[=   ]", "[==  ]", "[=== ]", "[ ===]", "[  ==]", "[   =]", "[    ]",
                "[   =]", "[  ==]", "[ ===]", "[====]", "[=== ]", "[==  ]", "[=   ]",
            ])
            .template("{spinner:.blue} [{elapsed_precise}] {msg}"),
    );

    loop {
        let mut res = fetch_messages(token, channel, before, oldest);
        let res_len = res.len();
        if res_len > 0 {
            messages.append(&mut res);
            pb.set_message(&format!("Fetched {} messages", messages.len()));

            let last = messages.last().unwrap();
            before = Some(last.id.to_string().to_owned());
        } else {
            break;
        }
    }

    pb.finish_with_message(&format!(
        "Fetched {} messages! Filtering...",
        messages.len()
    ));

    let filtered: Vec<MessageAttachment> = messages
        .clone()
        .into_iter()
        .filter(|m| m.attachments.len() != 0)
        .flat_map(|m| m.attachments)
        .filter(|a| a.height.is_some() && a.width.is_some())
        .collect::<Vec<_>>();

    let filtered_len = filtered.len();
    if filtered_len >= 1 {
        let suffix = if filtered_len == 1 { "" } else { "s" };
        println!(
            "[00:00:00] {} message{} contain an image! Download...",
            filtered.len(),
            suffix
        );
    } else {
        println!(
            "[00:00:00] 0 of the {} messages contained images. Exiting...",
            messages.len()
        );
    }

    return filtered;
}
