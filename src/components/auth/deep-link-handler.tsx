import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';

function getParameters(url: string) {
  const parameters: Record<string, string> = {};

  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');

  if (queryStart !== -1) {
    const queryEnd = hashStart !== -1 ? hashStart : url.length;
    const query = url.slice(queryStart + 1, queryEnd);

    for (const part of query.split('&')) {
      const [rawKey, rawValue] = part.split('=');

      if (rawKey && rawValue) {
        parameters[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
      }
    }
  }

  if (hashStart !== -1) {
    const fragment = url.slice(hashStart + 1);

    for (const part of fragment.split('&')) {
      const [rawKey, rawValue] = part.split('=');

      if (rawKey && rawValue) {
        parameters[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
      }
    }
  }

  return parameters;
}

async function handleAuthUrl(url: string) {
  const params = getParameters(url);

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  const type = params.type;

  if (!accessToken || !refreshToken) {
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error('Failed to create recovery session:', error.message);
    return;
  }

  if (type === 'recovery') {
    router.replace('/reset-password');
  }
}

export function DeepLinkHandler() {
  useEffect(() => {
    async function checkInitialUrl() {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        await handleAuthUrl(initialUrl);
      }
    }

    void checkInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}