import * as textToSpeech from "@google-cloud/text-to-speech";
import { protos } from "@google-cloud/text-to-speech";
// Creates a client
const client = new textToSpeech.TextToSpeechClient();

export class TextToSpeechService {
  public async synthesizeSpeech(text: string): Promise<Buffer> {
    // Construct the request
    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest =
      {
        input: { text: text },
        voice: {
          languageCode: "en-US",
          ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE,
        },
        audioConfig: {
          audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
        },
      };

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    return response.audioContent as Buffer;
  }
}
