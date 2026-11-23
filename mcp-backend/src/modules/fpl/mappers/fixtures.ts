import { byId } from "../helpers/byId";
import { teamName } from "../helpers/team";

import type { Bootstrap, FixturePayload, FixtureView, Team } from "../types";

/**
 * Fixtures in `gameweek`. Scores are included when the match has them.
 */
function mapFixtures(fixtures: readonly FixturePayload[], bootstrap: Bootstrap, gameweek: number): FixtureView[] {
    const teams = byId(bootstrap.teams);

    return fixtures.filter((fixture) => fixture.event === gameweek).map((fixture) => mapFixture(fixture, teams));
}

/**
 * One fixture. Scores are copied only when both are present.
 */
function mapFixture(fixture: FixturePayload, teams: Map<number, Team>): FixtureView {
    const view: FixtureView = {
        home: teamName(teams, fixture.team_h),
        away: teamName(teams, fixture.team_a),
        kickoff: fixture.kickoff_time,
        home_difficulty: fixture.team_h_difficulty,
        away_difficulty: fixture.team_a_difficulty,
    };

    if (fixture.team_h_score !== null && fixture.team_a_score !== null) {
        view.home_score = fixture.team_h_score;
        view.away_score = fixture.team_a_score;
    }

    return view;
}

export { mapFixtures };
