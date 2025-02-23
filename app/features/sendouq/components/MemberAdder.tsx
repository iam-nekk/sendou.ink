import { useFetcher } from "@remix-run/react";
import { useCopyToClipboard } from "react-use";
import { Button } from "~/components/Button";
import { SubmitButton } from "~/components/SubmitButton";
import {
  SENDOUQ_PREPARING_PAGE,
  SENDOU_INK_BASE_URL,
  sendouQInviteLink,
} from "~/utils/urls";
import * as React from "react";

export function MemberAdder({
  inviteCode,
  trustedPlayers,
}: {
  inviteCode: string;
  trustedPlayers: Array<{
    id: number;
    discordName: string;
  }>;
}) {
  const [trustedUser, setTrustedUser] = React.useState<number>();
  const fetcher = useFetcher();
  const inviteLink = `${SENDOU_INK_BASE_URL}${sendouQInviteLink(inviteCode)}`;
  const [, copyToClipboard] = useCopyToClipboard();

  const trustedPlayerIdsJoined = trustedPlayers.map((p) => p.id).join(",");
  React.useEffect(() => {
    setTrustedUser(undefined);
  }, [trustedPlayerIdsJoined]);

  return (
    <div className="stack horizontal lg flex-wrap justify-center">
      {trustedPlayers.length > 0 ? (
        <fetcher.Form method="post" action={SENDOUQ_PREPARING_PAGE}>
          <label htmlFor="players">Add people you have played with</label>
          <div className="stack horizontal sm items-center">
            <select
              name="id"
              id="players"
              onChange={(e) =>
                setTrustedUser(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            >
              <option value="">Select member</option>
              {trustedPlayers.map((player) => {
                return (
                  <option key={player.id} value={player.id}>
                    {player.discordName}
                  </option>
                );
              })}
            </select>
            <SubmitButton
              variant="outlined"
              _action="ADD_TRUSTED"
              disabled={!trustedUser}
            >
              Add
            </SubmitButton>
          </div>
        </fetcher.Form>
      ) : null}
      <div>
        <label htmlFor="invite">Share your invite link</label>
        <div className="stack horizontal sm items-center">
          <input type="text" value={inviteLink} readOnly id="invite" />
          <Button
            variant="outlined"
            onClick={() => copyToClipboard(inviteLink)}
          >
            Copy
          </Button>
        </div>
      </div>
    </div>
  );
}
