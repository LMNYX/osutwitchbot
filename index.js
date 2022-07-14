const tmi = require('tmi.js');
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const ws = new WebSocket("ws://127.0.0.1:24050/ws");

var SkinName = "";
var CurrentMap = "";

ws.on('message', async (msg) => {
    msg = JSON.parse(msg.toString());

    if(SkinName != msg['settings']['folders']['skin'])
        SkinName = msg['settings']['folders']['skin'];
    if (CurrentMap != `${msg['menu']['bm']['metadata']['artist']} - ${msg['menu']['bm']['metadata']['title']} [${msg['menu']['bm']['metadata']['difficulty']}] (by ${msg['menu']['bm']['metadata']['mapper']}): https://osu.ppy.sh/beatmapsets/${msg['menu']['bm']['set']}` && msg['menu']['bm']['set'] != -1)
        CurrentMap = `${msg['menu']['bm']['metadata']['artist']} - ${msg['menu']['bm']['metadata']['title']} [${msg['menu']['bm']['metadata']['difficulty']}] (by ${msg['menu']['bm']['metadata']['mapper']}): https://osu.ppy.sh/beatmapsets/${msg['menu']['bm']['set']}`;
    else
        CurrentMap = `${msg['menu']['bm']['metadata']['artist']} - ${msg['menu']['bm']['metadata']['title']} [${msg['menu']['bm']['metadata']['difficulty']}] (by ${msg['menu']['bm']['metadata']['mapper']}): unsubmitted`;
});

ws.on('error', async (e) => {
    if (e.code == "ECONNREFUSED")
    {
        console.log("Start gosumemory first, then the bot.");
        process.exit(-1);
    }
});

const REWARD_IDS = {
    "OSU_MAP_REQUEST": process.env.REWARD_ID
};

const OSU_GAME_PATH = process.env.OSU_PATH;

const client = new tmi.Client({
    channels: [process.env.CHANNEL],
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: process.env.BOT_USERNAME,
        password: process.env.BOT_PASSWORD
    }
});

const areRequestsEnabled = Boolean(process.env.IS_CUSTOM_REQUEST_ENABLED);

client.connect();

client.on('message', async (channel, tags, message, self) => {
    var re = /https:\/\/osu.ppy.sh\/beatmapsets\/(\d+)#(\w+)\/(\d+)/g;

    if (!('custom-reward-id' in tags)) {
        let cmd = message.split(' ');
        switch (cmd[0])
        {
            case '!skin':
                client.say(channel, `NowISee ${tags.username}, current skin is: ${SkinName}`);
                break;
            case '!np':
            case '!map':
                client.say(channel, `SheCrazy ${tags.username}, ${CurrentMap}`);
                break;
            default:
                break;
        }
        return;
    }

    if (!areRequestsEnabled) return;

    switch (tags['custom-reward-id'])
    {
        case REWARD_IDS['OSU_MAP_REQUEST']:
            var match = re.exec(message);
            if (match == null)
            {
                client.say(channel, `ReeferSad ${tags.username} you didn't give me a bancho map link, I can't download it automatically.`);
                return;
            }

            if (match[2] != "osu")
            {
                client.say(channel, `NOPE ${tags.username} I don't play anything other than std.`);
                return;
            }

            const response = await fetch(`https://kitsu.moe/api/s/${match[1]}`);
            const data = await response.json();

            if ('code' in data)
            {
                client.say(channel, `NOPE ${tags.username} : ${data['message']}`)    
            }


            client.say(channel, `dinkDonk ${tags.username} requested ${data['Artist']} - ${data['Title']}! Downloading it...`);
            
            let _d = Math.floor(Math.random()*10000);

            try
            {
                downloadfile(`https://kitsu.moe/api/d/${match[1]}`, `map_${_d}.osz`, () => { fs.rename(`map_${_d}.osz`, `${OSU_GAME_PATH}\\Songs\\map_${_d}.osz`, (e) => { }); });
            }
            catch (e)
            {
                client.say(channel, `PANIC ${tags.username} I couldn't download the map.`);
            }

            break;
        default: break;
    }
});

var downloadfile = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
    https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}