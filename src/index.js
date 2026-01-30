import React from "react";
import { createRoot } from "react-dom/client";
import "assets/css/App.css";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store";
import AuthLayout from "layouts/auth";
import AdminLayout from "layouts/admin";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "theme/theme";
import ProtectedRoute from "./components/ProtectedRoute";
import AppWrapper from "./components/AppWrapper";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <ChakraProvider theme={theme}>
      <React.StrictMode>
        <BrowserRouter>
          <AppWrapper>
            <Switch>
              <Route exact path="/" render={() => <Redirect to="/auth/sign-in" />} />
              <Route path={`/auth`} component={AuthLayout} />
              <ProtectedRoute path={`/admin`} component={AdminLayout} />
            </Switch>
          </AppWrapper>
        </BrowserRouter>
      </React.StrictMode>
    </ChakraProvider>
  </Provider>
);
