import React from "react";
import { Route, Switch } from "react-router-dom";
import CiPlDetail from "./CiPlDetail";
import CiPlArchivedList from "./CiPlArchivedList";

const CI_PL_BASE = "/admin/forms/ci-pl";

export default function CiPl() {
  return (
    <Switch>
      <Route exact path={`${CI_PL_BASE}/archived/:id`}>
        <CiPlDetail />
      </Route>
      <Route exact path={`${CI_PL_BASE}/archived`}>
        <CiPlArchivedList />
      </Route>
      <Route exact path={CI_PL_BASE}>
        <CiPlDetail />
      </Route>
    </Switch>
  );
}
