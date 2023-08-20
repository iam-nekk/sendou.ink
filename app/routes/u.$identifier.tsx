import type {
  LinksFunction,
  LoaderArgs,
  V2_MetaFunction,
  SerializeFrom,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useLocation } from "@remix-run/react";
import * as React from "react";
import invariant from "tiny-invariant";
import { z } from "zod";
import { Main } from "~/components/Main";
import { SubNav, SubNavLink } from "~/components/SubNav";
import { db } from "~/db";
import { countArtByUserId } from "~/features/art";
import { currentSeason } from "~/features/mmr";
import { userTopPlacements } from "~/features/top-search";
import { findVods } from "~/features/vods";
import { useTranslation } from "~/hooks/useTranslation";
import { useUser } from "~/modules/auth";
import { getUserId } from "~/modules/auth/user.server";
import { canAddCustomizedColorsToUserProfile, isAdmin } from "~/permissions";
import styles from "~/styles/u.css";
import { notFoundIfFalsy, type SendouRouteHandle } from "~/utils/remix";
import { discordFullName, makeTitle } from "~/utils/strings";
import {
  isCustomUrl,
  navIconUrl,
  userBuildsPage,
  userEditProfilePage,
  userPage,
  userResultsPage,
  userVodsPage,
  USER_SEARCH_PAGE,
  userArtPage,
  userSeasonsPage,
} from "~/utils/urls";

// const location = useLocation()

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export const meta: V2_MetaFunction = ({
  data,
}: {
  data: UserPageLoaderData;
}) => {
  if (!data) return [];
  //console.log(data)

  const {t} = useTranslation(['weapons','game-misc'])

  let title = makeTitle(discordFullName(data))

  let description = ""
  if (data.inGameName) description += `IGN: ${data.inGameName}\n`
  if (data.bio) description += data.bio + " \n"
  if (data.team) description += `Member of ${data.team.name}. \n`
  if (data.weapons) description += `Weapon pool: ${data.weapons.map((weapon)=>{
    let weaponName = t(`weapons:MAIN_${weapon.weaponSplId}`)
    return weapon.isFavorite ? "⭐" + weaponName : weaponName
  }).join(', ')}. \n`
  if (data.topPlacements.SZ || data.topPlacements.TC||data.topPlacements.RM||data.topPlacements.CB||data.topPlacements.TW) description += `Top placements: \n`
  if (data.topPlacements.SZ) description += `- SZ: ${data.topPlacements.SZ.rank}/${data.topPlacements.SZ.power}\n`
  if (data.topPlacements.TC) description += `- TC: ${data.topPlacements.TC.rank}/${data.topPlacements.TC.power}\n`
  if (data.topPlacements.RM) description += `- RM: ${data.topPlacements.RM.rank}/${data.topPlacements.RM.power}\n`
  if (data.topPlacements.CB) description += `- CB: ${data.topPlacements.CB.rank}/${data.topPlacements.CB.power}\n`
  if (data.topPlacements.TW) description += `- TW: ${data.topPlacements.TW.rank}/${data.topPlacements.TW.power}\n`
  if (data.twitter || data.twitch || data.youtubeId) description += "Socials: \n"
  if (data.twitter) description += `- Twitter: twitter.com/${data.twitter}\n`
  if (data.twitch) description += `- Twitch: twitch.tv/${data.twitch}\n`
  if (data.youtubeId) description += `- Youtube: youtube.com/channel/${data.youtubeId}\n`
  //console.log(description)
  
  return [
    { title: title },
    { property: "og:title", content: title},
    { property:"twitter:text:title", content: title},
    { name: "description", content: description },
    { property: "og:description", content: description },
    { property: "og:url", content: `https://sendou.ink${data.id}` },
    { name: "twitter:card", content: "summary" },
    { property: "og:image", content: `https://cdn.discordapp.com/avatars/${data.discordId}/${data.discordAvatar}.webp?size=600`}, 
    { property: "og:type", content: "profile" },
    { property: "profile:username", content: data.discordName },
    { property: "og:site_name", content: "sendou.ink" }
  ];
};

export const handle: SendouRouteHandle = {
  i18n: "user",
  breadcrumb: ({ match }) => {
    const data = match.data as UserPageLoaderData | undefined;

    if (!data) return [];

    return [
      {
        imgPath: navIconUrl("u"),
        href: USER_SEARCH_PAGE,
        type: "IMAGE",
      },
      {
        text: data.discordName,
        href: userPage(data),
        type: "TEXT",
      },
    ];
  },
};

export const userParamsSchema = z.object({ identifier: z.string() });

export type UserPageLoaderData = SerializeFrom<typeof loader>;

export const loader = async ({ params, request }: LoaderArgs) => {
  const loggedInUser = await getUserId(request);
  const { identifier } = userParamsSchema.parse(params);
  const user = notFoundIfFalsy(db.users.findByIdentifier(identifier));

  const { playerId, topPlacements } = userTopPlacements(user.id);
  return json({
    id: user.id,
    discordAvatar: user.discordAvatar,
    discordDiscriminator: user.discordDiscriminator,
    discordId: user.discordId,
    discordName: user.discordName,
    discordUniqueName: user.showDiscordUniqueName
      ? user.discordUniqueName
      : null,
    showDiscordUniqueName: user.showDiscordUniqueName,
    twitch: user.twitch,
    twitter: user.twitter,
    youtubeId: user.youtubeId,
    bio: user.bio,
    customUrl: user.customUrl,
    motionSens: user.motionSens,
    stickSens: user.stickSens,
    inGameName: user.inGameName,
    weapons: user.weapons,
    team: user.team,
    country: user.country,
    banned: isAdmin(loggedInUser) ? user.banned : undefined,
    css: canAddCustomizedColorsToUserProfile(user) ? user.css : undefined,
    badges: db.badges.findByOwnerId(user.id),
    // TODO: could load only on results page
    results: db.calendarEvents.findResultsByUserId(user.id),
    buildsCount: db.builds.countByUserId({
      userId: user.id,
      loggedInUserId: loggedInUser?.id,
    }),
    vods: findVods({ userId: user.id }),
    artCount: countArtByUserId(user.id),
    commissionsOpen: user.commissionsOpen,
    commissionText: user.commissionText,
    playerId,
    topPlacements,
  });
};

export default function UserPageLayout() {
  const data = useLoaderData<typeof loader>();
  const user = useUser();
  const { t } = useTranslation();

  const isOwnPage = data.id === user?.id;

  useReplaceWithCustomUrl();

  return (
    <Main>
      <SubNav>
        <SubNavLink to={userPage(data)}>{t("header.profile")}</SubNavLink>
        {/* TODO: show also when not current season */}
        {currentSeason(new Date()) ? (
          <SubNavLink to={userSeasonsPage({ user: data })}>Seasons</SubNavLink>
        ) : null}
        {isOwnPage && (
          <SubNavLink to={userEditProfilePage(data)} prefetch="intent">
            {t("actions.edit")}
          </SubNavLink>
        )}
        {data.results.length > 0 && (
          <SubNavLink to={userResultsPage(data)}>
            {t("results")} ({data.results.length})
          </SubNavLink>
        )}
        {(isOwnPage || data.buildsCount > 0) && (
          <SubNavLink
            to={userBuildsPage(data)}
            prefetch="intent"
            data-testid="builds-tab"
          >
            {t("pages.builds")} ({data.buildsCount})
          </SubNavLink>
        )}
        {data.vods.length > 0 && (
          <SubNavLink to={userVodsPage(data)}>
            {t("pages.vods")} ({data.vods.length})
          </SubNavLink>
        )}
        {(isOwnPage || data.artCount > 0) && (
          <SubNavLink to={userArtPage(data)} end={false}>
            {t("pages.art")} ({data.artCount})
          </SubNavLink>
        )}
      </SubNav>
      {data.banned ? <div className="text-warning">Banned</div> : null}
      <Outlet />
    </Main>
  );
}

function useReplaceWithCustomUrl() {
  const data = useLoaderData<typeof loader>();
  const location = useLocation();

  React.useEffect(() => {
    if (!data.customUrl) {
      return;
    }

    const identifier = location.pathname.replace("/u/", "").split("/")[0];
    invariant(identifier);

    if (isCustomUrl(identifier)) {
      return;
    }

    window.history.replaceState(
      null,
      "",
      location.pathname
        .split("/")
        .map((part) => (part === identifier ? data.customUrl : part))
        .join("/")
    );
  }, [location, data.customUrl]);
}
