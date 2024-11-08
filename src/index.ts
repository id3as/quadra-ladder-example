import path from 'path';
import fs from 'fs/promises';
import {
  Norsk,
  selectVideo,
  selectAudio,
  VideoEncodeRung,
  SrtInputSettings,
  selectVideoRendition,
  SourceMediaNode,
} from "@norskvideo/norsk-sdk";


const WorkingDir = "/mnt";

// values for this were picked out of thin air, please experiment!
// NB: For WHEP/WHIP you'll want a gop preset with no bframes
const ladderRungs: VideoEncodeRung[] = [
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    codec: {
      type: 'quadra-h264',
      lookAheadDepth: 10,
      gopPresetIndex: 9,
      crf: 24,
      vbvBufferSize: 2000,
      bitrate: 3200000
    },
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    codec: {
      type: 'quadra-h264',
      lookAheadDepth: 10,
      gopPresetIndex: 9,
      crf: 24,
      vbvBufferSize: 2000,
      bitrate: 2000000
    },
  },
  {
    name: "540p",
    frameRate: { frames: 25, seconds: 1 },
    width: 960,
    height: 540,
    codec: {
      type: 'quadra-h264',
      lookAheadDepth: 10,
      gopPresetIndex: 9,
      crf: 24,
      vbvBufferSize: 2000,
      bitrate: 1000000
    },
  },
  {
    name: "320p",
    frameRate: { frames: 25, seconds: 1 },
    width: 640,
    height: 320,
    codec: {
      type: 'quadra-h264',
      lookAheadDepth: 10,
      gopPresetIndex: 9,
      crf: 24,
      vbvBufferSize: 2000,
      bitrate: 500000
    },
  },
];

// TODO: SDI, etc
async function tsOverIpInput(norsk: Norsk) {
  return norsk.input.udpTs({
    id: "source",
    sourceName: "source",
    host: '0.0.0.0',
    port: 5001,
  })
}

export async function main() {
  const norsk = await Norsk.connect();

  // TODO: Switch this out for SDI/etc based on configuration
  const input = await tsOverIpInput(norsk);
  session(norsk, input);
}

export async function session(norsk: Norsk, input: SourceMediaNode) {

  // We don't know what the source is
  // so if encoded we'll run it through a software decoder
  // so we can handle de-interlacing if required
  const decode = await norsk.processor.transform.videoDecode({
    decoder: 'software'
  })

  // We only support software deinterlacing
  const deinterlace = await norsk.processor.transform.videoTransform({
    deinterlace: {
      type: 'software',
      algorithm: 'yadif'
    }
  });

  const encode = await norsk.processor.transform.videoEncode({
    id: `ladder`,
    rungs: ladderRungs,
  });

  encode.subscribe([
    { source: deinterlace, sourceSelector: selectVideo }
  ])

  // I'm not sure what outputs you want, presumably WHIP/WHEP or such
  const outputs = await Promise.all(ladderRungs.map(async (r) => {
    const whep = await norsk.output.whep({
      id: `whep-${r.name}`
    })
    whep.subscribe([
      { source: encode, sourceSelector: selectVideoRendition(r.name) }
    ])
    return whep;
  }))

  outputs.forEach((o) => {
    console.log("Whep player at", o.playerUrl);
  })

  // We're waiting on the input context
  // if the source is raw (SDI) then there is no point in using the decoder
  const AwaitInputContext = {
    sourceContextChange: async () => {
      const videoStream = input.outputStreams.find((s) => s.message.case == 'video');
      if (videoStream?.message.case != 'video') return false;

      if (videoStream.message.value.codec == 'raw') {
        decode.subscribe([]);
        deinterlace.subscribe([{ source: input, sourceSelector: selectVideo }])
      } else {
        decode.subscribe([{ source: input, sourceSelector: selectVideo }]);
        deinterlace.subscribe([{ source: decode, sourceSelector: selectVideo }])
      }
      return false;
    }
  }
  input.registerForContextChange(AwaitInputContext);
}

void main();
