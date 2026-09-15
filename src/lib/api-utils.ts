import { NextResponse } from "next/server";
import { SheetsApiError, SheetsConfigError } from "./sheets";

/**
 * Turns any thrown error from a route handler into a friendly JSON
 * response. Raw stack traces / Google API internals are never sent to the
 * browser (spec section 32).
 */
export function handleApiError(err: unknown) {
  console.error(err);

  if (err instanceof SheetsConfigError) {
    return NextResponse.json(
      {
        error:
          "The app isn't connected to Google Sheets yet. Please check the server configuration.",
      },
      { status: 500 }
    );
  }

  if (err instanceof SheetsApiError) {
    return NextResponse.json(
      { error: "Unable to reach Google Sheets right now. Please check your connection and try again." },
      { status: 502 }
    );
  }

  if (err instanceof Error) {
    // Errors we throw ourselves (validation, duplicate customer, etc.) have
    // messages that are already safe and useful to show directly.
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
