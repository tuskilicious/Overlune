import type { ChatMessage } from "../overlays/chat/ChatView";
import { parseLine } from "../twitch/parse";

// Sample chat for the editor preview, written as real IRC lines so it goes through the same parser as live chat.
const lines = [
  "@id=s1;badges=broadcaster/1;color=#9146FF;display-name=You :you!you@you.tmi.twitch.tv PRIVMSG #you :Welcome in, everyone!",
  "@id=s2;badges=subscriber/6;color=#FF7F50;display-name=PixelFan;emotes=25:18-22 :pixelfan!pixelfan@pixelfan.tmi.twitch.tv PRIVMSG #you :Love the new look Kappa",
  "@id=s3;badges=moderator/1;color=#1E90FF;display-name=ModSquad :modsquad!modsquad@modsquad.tmi.twitch.tv PRIVMSG #you :\u0001ACTION waves hello\u0001",
  "@id=s4;badges=vip/1;display-name=LongMessageLarry :longmessagelarry!longmessagelarry@longmessagelarry.tmi.twitch.tv PRIVMSG #you :This is a longer message to show how chat wraps when someone has a lot to say about the stream.",
  "@id=s5;color=#2E8B57;display-name=NewViewer :newviewer!newviewer@newviewer.tmi.twitch.tv PRIVMSG #you :first time here, hi!",
];

export const chatSamples = lines.map(parseLine).filter((e): e is ChatMessage => e.type === "chat");
