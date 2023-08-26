import type {
  LinksFunction,
  LoaderArgs,
  V2_MetaFunction,
  SerializeFrom,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import clsx from "clsx";
import * as React from "react";
import { Button, LinkButton } from "~/components/Button";
import { Image, WeaponImage } from "~/components/Image";
import { Main } from "~/components/Main";
import { YouTubeEmbed } from "~/components/YouTubeEmbed";
import { useIsMounted } from "~/hooks/useIsMounted";
import { useSearchParamState } from "~/hooks/useSearchParamState";
import { useTranslation } from "~/hooks/useTranslation";
import { useUser } from "~/modules/auth";
import { databaseTimestampToDate } from "~/utils/dates";
import { secondsToMinutes } from "~/utils/number";
import { notFoundIfFalsy, type SendouRouteHandle } from "~/utils/remix";
import { makeTitle } from "~/utils/strings";
import type { Unpacked } from "~/utils/types";
import {
  modeImageUrl,
  navIconUrl,
  newVodPage,
  stageImageUrl,
  VODS_PAGE,
  vodVideoPage,
} from "~/utils/urls";
import { PovUser } from "../components/VodPov";
import { findVodById } from "../queries/findVodById.server";
import type { Vod } from "../vods-types";
import { canEditVideo } from "../vods-utils";
import styles from "../vods.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export const handle: SendouRouteHandle = {
  breadcrumb: ({ match }) => {
    const data = match.data as SerializeFrom<typeof loader> | undefined;

    if (!data) return [];

    return [
      {
        imgPath: navIconUrl("vods"),
        href: VODS_PAGE,
        type: "IMAGE",
      },
      {
        text: data.vod.title,
        href: vodVideoPage(data.vod.id),
        type: "TEXT",
      },
    ];
  },
};

export const meta: V2_MetaFunction = (args) => {
  /*{ title: title },
    { property: "og:title", content: title},
    { property:"twitter:text:title", content: title},
    { name: "description", content: description },
    { property: "og:description", content: description },
    { property: "og:url", content: `https://sendou.ink${data.id}` },
    { name: "twitter:card", content: "summary" },
    //{ property: "og:image", content: `https://sendou.ink/proxy/discord-pfp/${data.discordId}/${data.discordAvatar}`}, 
    { property: "og:image", content: `https://cdn.discordapp.com/avatars/${data.discordId}/${data.discordAvatar}/webp?size=600`}, 
    { property: "og:type", content: "profile" },
    { property: "profile:username", content: data.discordName },
    { property: "og:site_name", content: "sendou.ink" }*/ 
  const data = args.data as SerializeFrom<typeof loader> | null;

  if (!data) return [];

  const {t} = useTranslation(["game-misc","weapons"])

  let description = ""

  description += `${data.vod.matches.length} ${data.vod.matches.length < 1 ? "match was" : "matches were"} played.\n`
  for (let match of data.vod.matches) {
    description += ` - ${match.mode} ${t(`game-misc:STAGE_${match.stageId}`)} \n`
    description += `   The following ${match.weapons.length > 1 ? "weapons were":"weapon was"} played: `
    description += match.weapons.map((weapon)=>{
      return t(`weapons:MAIN_${weapon}`)
    }).join(", ")
    description += "\n"
  }

  return [
    { title: makeTitle(data.vod.title) },
    { property: "og:title", content: data.vod.title },
    { name: "description", content: description },
    { property: "og:description", content: description },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:image", content: `https://img.youtube.com/vi/${data.vod.youtubeId}/0.jpg` },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "sendou.ink" },
  ];
};

export const loader = ({ params }: LoaderArgs) => {
  const vod = notFoundIfFalsy(findVodById(Number(params["id"])));

  return { vod };
};

export default function VodPage() {
  const [start, setStart] = useSearchParamState({
    name: "start",
    defaultValue: 0,
    revive: Number,
  });
  const { i18n } = useTranslation();
  const isMounted = useIsMounted();
  const [autoplay, setAutoplay] = React.useState(false);
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(["common"]);
  const user = useUser();

  return (
    <Main className="stack lg">
      <div className="stack sm">
        <YouTubeEmbed
          key={start}
          id={data.vod.youtubeId}
          start={start}
          autoplay={autoplay}
        />
        <h2 className="text-sm">{data.vod.title}</h2>
        <div className="stack horizontal justify-between">
          <div className="stack horizontal sm items-center">
            <PovUser pov={data.vod.pov} />
            <time
              className={clsx("text-lighter text-xs", {
                invisible: !isMounted,
              })}
            >
              {isMounted
                ? databaseTimestampToDate(
                    data.vod.youtubeDate
                  ).toLocaleDateString(i18n.language, {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                  })
                : "t"}
            </time>
          </div>

          {canEditVideo({
            submitterUserId: data.vod.submitterUserId,
            userId: user?.id,
            povUserId:
              typeof data.vod.pov === "string" ? undefined : data.vod.pov?.id,
          }) ? (
            <LinkButton
              to={newVodPage(data.vod.id)}
              size="tiny"
              testId="edit-vod-button"
            >
              {t("common:actions.edit")}
            </LinkButton>
          ) : null}
        </div>
      </div>
      <div className="vods__matches">
        {data.vod.matches.map((match) => (
          <Match
            key={match.id}
            match={match}
            setStart={(newStart) => {
              setStart(newStart);
              setAutoplay(true);
              window.scrollTo(0, 0);
            }}
          />
        ))}
      </div>
    </Main>
  );
}

function Match({
  match,
  setStart,
}: {
  match: Unpacked<Vod["matches"]>;
  setStart: (start: number) => void;
}) {
  const { t } = useTranslation(["game-misc", "weapons"]);

  const weapon = match.weapons.length === 1 ? match.weapons[0]! : null;
  const weapons = match.weapons.length === 8 ? match.weapons : null;

  return (
    <div className="vods__match">
      <Image
        alt=""
        path={stageImageUrl(match.stageId)}
        width={120}
        className="rounded"
      />
      {weapon ? (
        <WeaponImage
          weaponSplId={weapon}
          variant="badge"
          width={42}
          className="vods__match__weapon"
          testId={`weapon-img-${weapon}`}
        />
      ) : null}
      <Image
        path={modeImageUrl(match.mode)}
        width={32}
        className={clsx("vods__match__mode", { cast: Boolean(weapons) })}
        alt={t(`game-misc:MODE_LONG_${match.mode}`)}
        title={t(`game-misc:MODE_LONG_${match.mode}`)}
      />
      {weapons ? (
        <div className="stack horizontal md">
          <div className="vods__match__weapons">
            {weapons.slice(0, 4).map((weapon, i) => {
              return (
                <WeaponImage
                  key={i}
                  testId={`weapon-img-${weapon}-${i}`}
                  weaponSplId={weapon}
                  variant="badge"
                  width={30}
                />
              );
            })}
          </div>
          <div className="vods__match__weapons">
            {weapons.slice(4).map((weapon, i) => {
              const adjustedI = i + 4;
              return (
                <WeaponImage
                  key={i}
                  testId={`weapon-img-${weapon}-${adjustedI}`}
                  weaponSplId={weapon}
                  variant="badge"
                  width={30}
                />
              );
            })}
          </div>
        </div>
      ) : null}
      <Button
        size="tiny"
        onClick={() => setStart(match.startsAt)}
        variant="outlined"
      >
        {secondsToMinutes(match.startsAt)}
      </Button>
    </div>
  );
}
