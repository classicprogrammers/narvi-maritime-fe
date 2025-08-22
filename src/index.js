import React from 'react';
import ReactDOM from 'react-dom';
import 'assets/css/App.css';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './redux/store';
import AuthLayout from 'layouts/auth';
import AdminLayout from 'layouts/admin';
import RtlLayout from 'layouts/rtl';
import { ChakraProvider } from '@chakra-ui/react';
import theme from 'theme/theme';
import { ThemeEditorProvider } from '@hypertheme-editor/chakra-ui';

ReactDOM.render(
	<Provider store={store}>
		<ChakraProvider theme={theme}>
			<React.StrictMode>
				<ThemeEditorProvider>
					<BrowserRouter>
						<Switch>
							<Route path={`/auth`} component={AuthLayout} />
							<Route path={`/admin`} component={AdminLayout} />
							<Route path={`/rtl`} component={RtlLayout} />
							<Redirect from='/' to='/admin' />
						</Switch>
					</BrowserRouter>
				</ThemeEditorProvider>
			</React.StrictMode>
		</ChakraProvider>
	</Provider>,
	document.getElementById('root')
);
