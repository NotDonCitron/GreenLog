import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityItem } from "./activity-item";
import type { ProfileRow, UserActivity } from "@/lib/types";

const user = {
  id: "user-1",
  username: "strain-hunter",
  display_name: "Strain Hunter",
  avatar_url: null,
} as ProfileRow;

const activity = {
  id: "activity-1",
  user_id: "user-1",
  activity_type: "favorite_added",
  target_id: "wedding-cake",
  target_name: "Wedding Cake",
  target_image_url: "https://example.invalid/wedding-cake.jpg",
  metadata: {},
  is_public: true,
  created_at: new Date().toISOString(),
} as UserActivity;

describe("ActivityItem", () => {
  it("falls back to the strain placeholder when the activity image fails", () => {
    render(<ActivityItem activity={activity} user={user} />);

    const image = screen.getByAltText("Wedding Cake") as HTMLImageElement;
    fireEvent.error(image);

    expect(image.src).toContain("/strains/placeholder-1.svg");
  });

  it("links grow activity target names to the grow detail page", () => {
    render(
      <ActivityItem
        activity={{
          ...activity,
          activity_type: "grow_started",
          target_id: "3d9e473a-fa25-42f5-a3cd-67a45321bd89",
          target_name: "testgrow",
          target_image_url: undefined,
        }}
        user={user}
      />
    );

    expect(screen.getByRole("link", { name: "testgrow" }).getAttribute("href")).toBe(
      "/grows/3d9e473a-fa25-42f5-a3cd-67a45321bd89"
    );
  });
});
