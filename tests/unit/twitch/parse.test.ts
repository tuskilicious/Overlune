import { describe, expect, it } from "vitest";
import { parseEmotes, parseLine, parseMessage } from "../../../src/twitch/parse";

// Sample lines follow the formats in Twitch's IRC docs (dev.twitch.tv/docs/chat/irc) and real traffic.

describe("PRIVMSG", () => {
  it("parses a chat message with badges, color and emotes", () => {
    const line =
      "@badge-info=subscriber/8;badges=broadcaster/1,subscriber/6;color=#1E90FF;display-name=Ronni;emotes=25:0-4,12-16/1902:6-10;first-msg=0;id=b34ccfc7-4977-403a-8a94-33c6bac34fb8;mod=0;room-id=1337;subscriber=1;tmi-sent-ts=1507246572675;turbo=0;user-id=1337;user-type= :ronni!ronni@ronni.tmi.twitch.tv PRIVMSG #ronni :Kappa Keepo Kappa";
    expect(parseLine(line)).toEqual({
      type: "chat",
      id: "b34ccfc7-4977-403a-8a94-33c6bac34fb8",
      channel: "ronni",
      login: "ronni",
      displayName: "Ronni",
      color: "#1E90FF",
      badges: { broadcaster: "1", subscriber: "6" },
      emotes: [
        { id: "25", start: 0, end: 4 },
        { id: "1902", start: 6, end: 10 },
        { id: "25", start: 12, end: 16 },
      ],
      text: "Kappa Keepo Kappa",
      action: false,
      bits: 0,
    });
  });

  it("parses bits", () => {
    const e = parseLine(
      "@badge-info=;badges=staff/1,bits/1000;bits=100;color=;display-name=ronni;emotes=;id=b34ccfc7-4977-403a-8a94-33c6bac34fb8;mod=0;room-id=12345678;subscriber=0;tmi-sent-ts=1507246572675;turbo=1;user-id=12345678;user-type=staff :ronni!ronni@ronni.tmi.twitch.tv PRIVMSG #ronni :cheer100",
    );
    expect(e).toMatchObject({ type: "chat", bits: 100, text: "cheer100", color: undefined });
  });

  it("handles /me, unescapes tags and keeps the colon in the message", () => {
    const e = parseLine(
      "@badges=;color=#FF0000;display-name=Some\\sOne;emotes=;id=abc :someone!someone@someone.tmi.twitch.tv PRIVMSG #dallas :\u0001ACTION waves: hi :)\u0001",
    );
    expect(e).toMatchObject({ displayName: "Some One", text: "waves: hi :)", action: true });
  });

  it("keeps emote offsets as code points when emoji come first", () => {
    const e = parseLine(
      "@badges=;color=;display-name=a;emotes=25:3-7;id=x :a!a@a.tmi.twitch.tv PRIVMSG #b :😀😀 Kappa",
    );
    if (e.type !== "chat") throw new Error("expected chat");
    const [em] = e.emotes;
    expect(
      Array.from(e.text)
        .slice(em!.start, em!.end + 1)
        .join(""),
    ).toBe("Kappa");
  });

  it("drops an invalid color (it would reach CSS)", () => {
    const e = parseLine(
      "@color=red;url(x);display-name=a;id=x :a!a@a.tmi.twitch.tv PRIVMSG #b :hi",
    );
    expect(e).toMatchObject({ type: "chat", color: undefined });
  });
});

describe("USERNOTICE", () => {
  it("parses a sub", () => {
    const e = parseLine(
      "@badge-info=subscriber/0;badges=subscriber/0,premium/1;color=;display-name=ronni;emotes=;id=db25007f-7a18-43eb-9379-80131e44d633;login=ronni;mod=0;msg-id=sub;msg-param-cumulative-months=1;msg-param-months=0;msg-param-should-share-streak=0;msg-param-sub-plan-name=Channel\\sSubscription\\s(ronni);msg-param-sub-plan=Prime;room-id=12345678;subscriber=1;system-msg=ronni\\ssubscribed\\swith\\sTwitch\\sPrime.;tmi-sent-ts=1507246572675;user-id=87654321;user-type= :tmi.twitch.tv USERNOTICE #dallas",
    );
    expect(e).toEqual({
      type: "usernotice",
      kind: "sub",
      msgId: "sub",
      channel: "dallas",
      login: "ronni",
      displayName: "ronni",
      text: "",
      months: 1,
      recipient: undefined,
      viewers: 0,
      giftCount: 0,
      giftId: undefined,
    });
  });

  it("parses a resub with a message", () => {
    const e = parseLine(
      "@badge-info=;badges=staff/1,broadcaster/1,turbo/1;color=#008000;display-name=ronni;emotes=;id=db25007f-7a18-43eb-9379-80131e44d633;login=ronni;mod=0;msg-id=resub;msg-param-cumulative-months=6;msg-param-streak-months=2;msg-param-should-share-streak=1;msg-param-sub-plan=Prime;msg-param-sub-plan-name=Prime;room-id=12345678;subscriber=1;system-msg=ronni\\shas\\ssubscribed\\sfor\\s6\\smonths!;tmi-sent-ts=1507246572675;turbo=1;user-id=87654321;user-type=staff :tmi.twitch.tv USERNOTICE #dallas :Great stream -- keep it up!",
    );
    expect(e).toMatchObject({
      kind: "resub",
      months: 6,
      displayName: "ronni",
      text: "Great stream -- keep it up!",
    });
  });

  it("parses a gifted sub", () => {
    const e = parseLine(
      "@badge-info=;badges=staff/1,premium/1;color=#0000FF;display-name=TWW2;emotes=;id=e9176cd8-5e22-4684-ad40-ce53c2561c5e;login=tww2;mod=0;msg-id=subgift;msg-param-months=1;msg-param-recipient-display-name=Mr_Woodchuck;msg-param-recipient-id=55554444;msg-param-recipient-user-name=mr_woodchuck;msg-param-sub-plan-name=House\\sof\\sNyoro~n;msg-param-sub-plan=1000;room-id=19571752;subscriber=0;system-msg=TWW2\\sgifted\\sa\\sTier\\s1\\ssub\\sto\\sMr_Woodchuck!;tmi-sent-ts=1521159445153;turbo=0;user-id=87654321;user-type=staff :tmi.twitch.tv USERNOTICE #forstycup",
    );
    expect(e).toMatchObject({
      kind: "subgift",
      displayName: "TWW2",
      recipient: "Mr_Woodchuck",
      months: 1,
      channel: "forstycup",
    });
  });

  it("parses a gift bomb and links its gifts by id", () => {
    const bomb = parseLine(
      "@badge-info=;badges=subscriber/12;color=#8A2BE2;display-name=GenerousGal;emotes=;id=a1b2c3d4-0000-4000-8000-000000000001;login=generousgal;mod=0;msg-id=submysterygift;msg-param-community-gift-id=4412835412356789012;msg-param-mass-gift-count=5;msg-param-origin-id=4412835412356789012;msg-param-sender-count=25;msg-param-sub-plan=1000;room-id=12345678;subscriber=1;system-msg=GenerousGal\\sis\\sgifting\\s5\\sTier\\s1\\sSubs\\sto\\sdallas's\\scommunity!;tmi-sent-ts=1700000000000;user-id=5551234;user-type= :tmi.twitch.tv USERNOTICE #dallas",
    );
    expect(bomb).toMatchObject({
      kind: "giftbomb",
      msgId: "submysterygift",
      displayName: "GenerousGal",
      giftCount: 5,
      giftId: "4412835412356789012",
    });
  });

  it("parses a raid", () => {
    const e = parseLine(
      "@badge-info=;badges=turbo/1;color=#9ACD32;display-name=TestChannel;emotes=;id=3d830f12-795c-447d-af3c-ea05e40fbddb;login=testchannel;mod=0;msg-id=raid;msg-param-displayName=TestChannel;msg-param-login=testchannel;msg-param-viewerCount=15;room-id=33332222;subscriber=0;system-msg=15\\sraiders\\sfrom\\sTestChannel\\shave\\sjoined\\n!;tmi-sent-ts=1507246572675;turbo=1;user-id=123456;user-type= :tmi.twitch.tv USERNOTICE #othertestchannel",
    );
    expect(e).toMatchObject({ kind: "raid", displayName: "TestChannel", viewers: 15 });
  });

  it("keeps unmapped notices as kind other", () => {
    const e = parseLine(
      "@display-name=a;login=a;msg-id=announcement :tmi.twitch.tv USERNOTICE #b :hello",
    );
    expect(e).toMatchObject({ type: "usernotice", kind: "other", msgId: "announcement" });
  });

  it("treats a garbage count as 0", () => {
    const e = parseLine(
      "@login=a;msg-id=raid;msg-param-viewerCount=-5x :tmi.twitch.tv USERNOTICE #b",
    );
    expect(e).toMatchObject({ kind: "raid", viewers: 0 });
  });
});

describe("moderation", () => {
  it("parses CLEARMSG", () => {
    expect(
      parseLine(
        "@login=foo;room-id=;target-msg-id=94e6c7ff-bf98-4faa-af5d-7ad633a158a9;tmi-sent-ts=1642720582342 :tmi.twitch.tv CLEARMSG #bar :what a great day",
      ),
    ).toEqual({
      type: "clearmsg",
      channel: "bar",
      targetId: "94e6c7ff-bf98-4faa-af5d-7ad633a158a9",
    });
  });

  it("parses CLEARCHAT for one user", () => {
    expect(
      parseLine(
        "@ban-duration=350;room-id=12345678;target-user-id=87654321;tmi-sent-ts=1642715756806 :tmi.twitch.tv CLEARCHAT #dallas :ronni",
      ),
    ).toEqual({ type: "clearchat", channel: "dallas", login: "ronni" });
  });

  it("parses CLEARCHAT for the whole chat", () => {
    expect(
      parseLine("@room-id=12345678;tmi-sent-ts=1642715695392 :tmi.twitch.tv CLEARCHAT #dallas"),
    ).toEqual({ type: "clearchat", channel: "dallas" });
  });
});

describe("other lines", () => {
  it("parses PING", () => {
    expect(parseLine("PING :tmi.twitch.tv")).toEqual({ type: "ping", token: "tmi.twitch.tv" });
  });

  it("returns unknown for other commands", () => {
    expect(parseLine(":tmi.twitch.tv 001 justinfan123 :Welcome, GLHF!")).toEqual({
      type: "unknown",
      command: "001",
    });
  });

  it.each(["", "@", ":prefix-only", "@a=b", "PRIVMSG #x :no prefix or id", "   "])(
    "never throws on malformed input %j",
    (raw) => {
      expect(parseLine(raw).type).toBe("unknown");
    },
  );

  it("splits a frame with several lines", () => {
    const events = parseMessage(
      ":tmi.twitch.tv 001 justinfan1 :Welcome\r\nPING :tmi.twitch.tv\r\n@id=x;display-name=a :a!a@a.tmi.twitch.tv PRIVMSG #b :hi\r\n",
    );
    expect(events.map((e) => e.type)).toEqual(["unknown", "ping", "chat"]);
  });
});

describe("parseEmotes", () => {
  it("drops bad ids and ranges", () => {
    expect(parseEmotes("25:0-4,9-2,x/bad id:1-2/ok:1-1")).toEqual([
      { id: "25", start: 0, end: 4 },
      { id: "ok", start: 1, end: 1 },
    ]);
  });
});
