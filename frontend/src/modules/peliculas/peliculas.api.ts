import { httpClient } from '../../shared/api/httpClient';

export interface Movie {
  id: string;
  title: string;
  year: number | null;
  genre: string | null;
}

export interface MoviesResponse {
  strategy: string;
  movies: Movie[];
}

export async function fetchMovies(): Promise<MoviesResponse> {
  const { data } = await httpClient.get<MoviesResponse>('/peliculas/movies');
  return data;
}
