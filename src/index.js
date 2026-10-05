import "./bootstrapAuthStorage";
import React from "react";
import { createRoot } from "react-dom/client";
import "assets/css/App.css";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store";
import AuthLayout from "layouts/auth";
import AdminLayout from "layouts/admin";
import ClientLayout from "layouts/client";
import ClientLogin from "views/client/login";
import { Box, ChakraProvider } from "@chakra-ui/react";
import theme from "theme/theme";
import ProtectedRoute from "./components/ProtectedRoute";
import AppWrapper from "./components/AppWrapper";
import StagingBanner, { isStagingEnvironment, STAGING_BANNER_HEIGHT } from "./components/StagingBanner";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <ChakraProvider theme={theme}>
      <React.StrictMode>
        <BrowserRouter>
          <StagingBanner />
          <AppWrapper>
            <Box pt={isStagingEnvironment ? STAGING_BANNER_HEIGHT : 0}>
            <Switch>
              <Route exact path="/" render={() => <Redirect to="/auth/sign-in" />} />
              <Route path={`/auth`} component={AuthLayout} />
              <ProtectedRoute path={`/admin`} component={AdminLayout} />
              <Route exact path="/Client/login" component={ClientLogin} />
              <ProtectedRoute
                path={`/Client`}
                component={ClientLayout}
                redirectPath="/Client/login"
              />
            </Switch>
            </Box>
          </AppWrapper>
        </BrowserRouter>
      </React.StrictMode>
    </ChakraProvider>
  </Provider>
);
