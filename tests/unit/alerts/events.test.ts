import { describe, expect, it } from "vitest";
import { createAlertMapper } from "../../../src/alerts/events";
import { parseLine } from "../../../src/twitch/parse";

// Real-format IRC lines (dev.twitch.tv/docs/chat/irc), parsed, then mapped.
const notice = (tags: string, text = "") =>
  parseLine(`@${tags} :tmi.twitch.tv USERNOTICE #dallas${text ? ` :${text}` : ""}`);
const alerts = (...lines: ReturnType<typeof parseLine>[]) => {
  const toAlert = createAlertMapper();
  return lines.map(toAlert).filter((a) => a !== null);
};

const gift = (id: string, recipient: string, giftId?: string, login = "generousgal") =>
  notice(
    `display-name=GenerousGal;id=${id};login=${login};msg-id=subgift;msg-param-months=1;msg-param-recipient-display-name=${recipient};msg-param-sub-plan=1000${giftId ? `;msg-param-community-gift-id=${giftId}` : ""}`,
  );
const bomb = (count: number, giftId: string, login = "generousgal", name = "GenerousGal") =>
  notice(
    `display-name=${name};id=b;login=${login};msg-id=submysterygift;msg-param-community-gift-id=${giftId};msg-param-mass-gift-count=${count};msg-param-sub-plan=1000`,
  );

describe("alert mapping", () => {
  it("maps a raid to the raider and viewer count", () => {
    expect(
      alerts(
        notice(
          "display-name=TestChannel;login=testchannel;msg-id=raid;msg-param-displayName=TestChannel;msg-param-viewerCount=15",
        ),
      ),
    ).toEqual([{ kind: "raid", user: "TestChannel", amount: 15, message: "" }]);
  });

  it("maps a new sub", () => {
    expect(
      alerts(
        notice(
          "display-name=Ronni;login=ronni;msg-id=sub;msg-param-cumulative-months=1;msg-param-sub-plan=Prime",
        ),
      ),
    ).toEqual([{ kind: "sub", user: "Ronni", amount: 1, message: "" }]);
  });

  it("maps a resub with months and message", () => {
    expect(
      alerts(
        notice(
          "display-name=Ronni;login=ronni;msg-id=resub;msg-param-cumulative-months=6;msg-param-sub-plan=1000",
          "Great stream -- keep it up!",
        ),
      ),
    ).toEqual([
      { kind: "resub", user: "Ronni", amount: 6, message: "Great stream -- keep it up!" },
    ]);
  });

  it("maps a single gift sub to the gifter", () => {
    expect(alerts(gift("g1", "Mr_Woodchuck"))).toEqual([
      { kind: "subgift", user: "GenerousGal", amount: 1, message: "" },
    ]);
  });

  it("maps bits to the cheerer, amount and message", () => {
    expect(
      alerts(
        parseLine(
          "@bits=100;display-name=Ronni;id=c1 :ronni!ronni@ronni.tmi.twitch.tv PRIVMSG #dallas :cheer100 nice",
        ),
      ),
    ).toEqual([{ kind: "bits", user: "Ronni", amount: 100, message: "cheer100 nice" }]);
  });

  it("ignores plain chat, unknown notices and everything else", () => {
    expect(
      alerts(
        parseLine("@id=1;display-name=a :a!a@a.tmi.twitch.tv PRIVMSG #dallas :hi"),
        notice("display-name=a;login=a;msg-id=announcement", "hello"),
        parseLine("PING :tmi.twitch.tv"),
        parseLine(":tmi.twitch.tv CLEARCHAT #dallas"),
      ),
    ).toEqual([]);
  });
});

describe("gift bombs", () => {
  it("are one alert for the whole bomb, not one per gift", () => {
    const lines = [
      bomb(5, "777"),
      ...["A", "B", "C", "D", "E"].map((r, i) => gift(`g${i}`, r, "777")),
    ];
    expect(alerts(...lines)).toEqual([
      { kind: "subgift", user: "GenerousGal", amount: 5, message: "" },
    ]);
  });

  it("don't swallow separate gifts that aren't part of the bomb", () => {
    expect(
      alerts(bomb(2, "777"), gift("g1", "A", "777"), gift("g2", "Z", "999"), gift("g3", "Y")),
    ).toHaveLength(3);
  });

  it("show anonymous gifters as Anonymous", () => {
    expect(
      alerts(
        bomb(3, "555", "ananonymousgifter", "AnAnonymousGifter"),
        gift("g1", "A", "555", "ananonymousgifter"),
      ),
    ).toEqual([{ kind: "subgift", user: "Anonymous", amount: 3, message: "" }]);
  });

  it("only remember recent bombs, so memory stays small", () => {
    const toAlert = createAlertMapper();
    toAlert(bomb(1, "first"));
    for (let i = 0; i < 20; i++) toAlert(bomb(1, `later${i}`));
    // The first bomb was forgotten, so a late gift from it alerts on its own instead of vanishing.
    expect(toAlert(gift("g", "A", "first"))).not.toBeNull();
    expect(toAlert(gift("g", "A", "later19"))).toBeNull();
  });
});
