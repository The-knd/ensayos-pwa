import type { FrontendModule } from '../registry/types';
import { PeliculasPage } from './PeliculasPage';

export const peliculasModule: FrontendModule = {
  module: 'peliculas',
  label: 'Películas',
  basePath: '/peliculas',
  routes: [{ path: '/peliculas', perm: 'peliculas.read', element: <PeliculasPage /> }],
};
