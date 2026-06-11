import React from 'react';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

const routeContext = require.context('./app', true, /\.[jt]sx?$/);

function MemeZoApp() {
  return React.createElement(ExpoRoot, { context: routeContext });
}

registerRootComponent(MemeZoApp);
