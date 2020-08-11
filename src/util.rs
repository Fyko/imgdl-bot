use std::ffi::OsStr;
use std::path::Path;

pub fn file_extension(file: &str) -> Option<&str> {
    Path::new(file).extension().and_then(OsStr::to_str)
}

#[derive(Deserialize, Serialize, Debug)]
struct VersionResponse {
    pub versions: Vec<Version>,
}

#[derive(Deserialize, Serialize, Debug)]
struct Version {
    pub num: String
}

pub async fn check_version() -> Result<(), ()> {
    let current = crate_version!();

    let res = reqwest::get("https://crates.io/api/v1/crates/imgdl/versions").await;
    let res: reqwest::Response = match res {
        Ok(res) => res,
        Err(_) => return Err(())
    };
    let res: VersionResponse = match res.json().await {
        Ok(json) => json,
        Err(_) => return Err(()),
    };

    let latest = res.versions.first();
    if latest.is_some() && latest.unwrap().num != current {
        warn!("An update is available! Please see https://github.com/Fyko/imgdl-bot/tree/cli#readme for more information!");
    }

    Ok(())
}