import type {
  LinksFunction,
  LoaderArgs,
  V2_MetaFunction,
  SerializeFrom,
} from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Main } from "~/components/Main";
import { type SendouRouteHandle, notFoundIfFalsy } from "~/utils/remix";
import { PlacementsTable } from "../components/Placements";
import { findPlacementsByPlayerId } from "../queries/findPlacements.server";
import styles from "../top-search.css";
import { removeDuplicates } from "~/utils/arrays";
import {
  navIconUrl,
  topSearchPage,
  topSearchPlayerPage,
  userPage,
} from "~/utils/urls";
import { i18next } from "~/modules/i18n";
import { makeTitle } from "~/utils/strings";
import { useTranslation } from "~/hooks/useTranslation";
import { monthYearToSpan } from "../top-search-utils";

export const handle: SendouRouteHandle = {
  breadcrumb: ({ match }) => {
    const data = match.data as SerializeFrom<typeof loader> | undefined;

    if (!data) return [];

    const firstName = data.placements[0]!.name;

    return [
      {
        imgPath: navIconUrl("xsearch"),
        href: topSearchPage(),
        type: "IMAGE",
      },
      {
        text: firstName,
        type: "TEXT",
        href: topSearchPlayerPage(data.placements[0]!.playerId),
      },
    ];
  },
};

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export const meta: V2_MetaFunction = (args) => {
  const data = args.data as SerializeFrom<typeof loader> | null;

  if (!data) return [];

  let description = `Top placements for ${data.placements[0].name}: \n`

  //console.log(data)

  for (let placement of data.placements){
    description += ` - ${placement.rank}/${placement.power} `
    description += `in ${placement.region === "WEST" ? "Tentatek Division": "Takoroka Division"}: `
    description += `${placement.mode} `
    description += `using ${placement.weaponSplId} `
    description += `(${monthYearToSpan(placement).from.month}/${monthYearToSpan(placement).from.year} - ${monthYearToSpan(placement).to.month}/${monthYearToSpan(placement).to.year})`
    
    description += "\n"
  }

  return [
    { title: data.title },
    { property: "og:title", content: data.title},
    { property:"twitter:text:title", content: data.title},
    { name: "description", content: description },
    { property: "og:description", content: description },
    { property: "og:url", content: `https://sendou.ink/` },
    { name: "twitter:card", content: "summary" },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "sendou.ink" }
  ];
};

export const loader = async ({ params, request }: LoaderArgs) => {
  const placements = notFoundIfFalsy(
    findPlacementsByPlayerId(Number(params["id"]))
  );

  const t = await i18next.getFixedT(request);

  return {
    placements,
    title: makeTitle([placements[0]!.name, t("pages.xsearch")]),
  };
};

export default function XSearchPlayerPage() {
  const { t } = useTranslation(["common"]);
  const data = useLoaderData<typeof loader>();

  const firstName = data.placements[0]!.name;
  const aliases = removeDuplicates(
    data.placements
      .map((placement) => placement.name)
      .filter((name) => name !== firstName)
  );

  const hasUserLinked = Boolean(data.placements[0]!.discordId);

  return (
    <Main halfWidth className="stack lg">
      <div>
        <h2 className="text-lg">
          {hasUserLinked ? (
            <Link to={userPage(data.placements[0]!)}>{firstName}</Link>
          ) : (
            <>{firstName}</>
          )}{" "}
          {t("common:xsearch.placements")}
        </h2>
        {aliases.length > 0 ? (
          <div className="text-lighter text-sm">
            {t("common:xsearch.aliases")} {aliases.join(", ")}
          </div>
        ) : null}
      </div>
      <PlacementsTable placements={data.placements} type="MODE_INFO" />
    </Main>
  );
}
