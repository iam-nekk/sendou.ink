import { LoaderArgs } from "@remix-run/node";
import { discordPfpParams } from "../proxy-schemas.server";

export async function loader({ params }: LoaderArgs) {
    const { discordId, discordAvatar } = discordPfpParams.parse(params)

    const newRequest = new Request(`http://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}`);
    //console.log("Request object", newRequest)
    const fetchReq = await fetch(newRequest);
    //console.log("Fetch Request ", fetchReq)
    return fetchReq
}