import { json } from "@remix-run/node";
import type { LoaderFunction, SerializeFrom, V2_MetaFunction } from "@remix-run/node";
import { Outlet, useLoaderData, useMatches, useParams } from "@remix-run/react";
import clsx from "clsx";
import { Badge } from "~/components/Badge";
import { LinkButton } from "~/components/Button";
import { Redirect } from "~/components/Redirect";
import { db } from "~/db";
import {
  type ManagersByBadgeId,
  type OwnersByBadgeId,
} from "~/db/models/badges/queries.server";
import { type Badge as BadgeDBType } from "~/db/types";
import { useUser } from "~/modules/auth";
import { canEditBadgeOwners } from "~/permissions";
import { discordFullName, makeTitle } from "~/utils/strings";
import { BADGES_PAGE, badgeUrl } from "~/utils/urls";
import { type BadgesLoaderData } from "../badges";
import { type TFunction } from "react-i18next";
import { useTranslation } from "~/hooks/useTranslation";
import { SPLATOON_3_XP_BADGE_VALUES } from "~/constants";

// he will be defined in BadgeDetailsPage()
// i need him here for the meta tags
//let badge: Pick<BadgeDBType, "code" | "id" | "displayName" | "hue"> | undefined

export interface BadgeDetailsContext {
  badgeName: string;
}

export interface BadgeDetailsLoaderData {
  owners: OwnersByBadgeId;
  managers: ManagersByBadgeId;
}

export const loader: LoaderFunction = ({ params }) => {
  const badgeId = Number(params["id"]);
  if (Number.isNaN(badgeId)) {
    throw new Response(null, { status: 404 });
  }

  return json<BadgeDetailsLoaderData>({
    owners: db.badges.ownersByBadgeId(badgeId),
    managers: db.badges.managersByBadgeId(badgeId),
  });
};

export const meta: V2_MetaFunction = (args) => {
  const data = args.data as SerializeFrom<typeof loader> | null;

  const { badge, t} = getBadgesData();


  if (!data) return [];
  if (!badge) return [];

  console.log(badge)


  const explanationText = badgeExplanationText(t, badge)

  let title = makeTitle(badge.displayName + " badge.")

  let description = explanationText + ". \n"
  description += `Managed by `
  description += data.managers.map((manager: { discordName: string; discordDiscriminator: string; })=>{
    return manager.discordName + "#" + manager.discordDiscriminator
  }).join(", ")
  description += "\n"

  description += `Owned by: `
  description += data.owners.map((owner: { discordName: any; discordDiscriminator: any; count: number; })=>{
    return `${owner.discordName}#${owner.discordDiscriminator} ${owner.count > 1 ? `(${owner.count})`: ""}`
  }).join(", ")
  description += "\n"
  
  return [
    { title: title },
    { property: "og:title", content: title},
    { property:"twitter:text:title", content: title},
    { name: "description", content: description },
    { property: "og:description", content: description },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:image", content: `https://sendou.ink${badgeUrl({code: badge.code, extension: "gif"})}` },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "sendou.ink" },
  ];
}

export default function BadgeDetailsPage() {
  const user = useUser();
  const [, parentRoute] = useMatches();
  const { badges } = parentRoute.data as BadgesLoaderData;
  const params = useParams();
  const data = useLoaderData<BadgeDetailsLoaderData>();
  const { t } = useTranslation("badges");

  const badge = badges.find((b) => b.id === Number(params["id"]));
  if (!badge) return <Redirect to={BADGES_PAGE} />;

  const context: BadgeDetailsContext = { badgeName: badge.displayName };

  return (
    <div className="stack md items-center">
      <Outlet context={context} />
      <Badge badge={badge} isAnimated size={200} />
      <div>
        <div className="badges__explanation">
          {badgeExplanationText(t, badge)}
        </div>
        <div
          className={clsx("badges__managers", {
            invisible: data.managers.length === 0,
          })}
        >
          {t("managedBy", {
            users: data.managers.map((m) => discordFullName(m)).join(", "),
          })}
        </div>
      </div>
      {canEditBadgeOwners({ user, managers: data.managers }) ? (
        <LinkButton to="edit" variant="outlined" size="tiny">
          Edit
        </LinkButton>
      ) : null}
      <div className="badges__owners-container">
        <ul className="badges__owners">
          {data.owners.map((owner) => (
            <li key={owner.id}>
              <span
                className={clsx("badges__count", {
                  invisible: owner.count <= 1,
                })}
              >
                ×{owner.count}
              </span>
              <span>{discordFullName(owner)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function getBadgesData(){
  const [, parentRoute] = useMatches();
  const { badges } = parentRoute.data as BadgesLoaderData;
  const params = useParams();
  const data = useLoaderData<BadgeDetailsLoaderData>();
  const { t } = useTranslation("badges");
  const badge = badges.find((b) => b.id === Number(params["id"]));

  return {badge, data, t, badges}
}

export function badgeExplanationText(
  t: TFunction<"badges", undefined>,
  badge: Pick<BadgeDBType, "displayName" | "code"> & { count?: number }
) {
  if (badge.code === "patreon") return t("patreon");
  if (badge.code === "patreon_plus") {
    return t("patreon+");
  }
  if (
    badge.code.startsWith("xp") ||
    SPLATOON_3_XP_BADGE_VALUES.includes(Number(badge.code) as any)
  ) {
    return t("xp", { xpText: badge.displayName });
  }

  return t("tournament", {
    count: badge.count ?? 1,
    tournament: badge.displayName,
  }).replace("&#39;", "'");
}
