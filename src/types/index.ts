export type Category = "yellow" | "green" | "blue" | "purple";

export interface Connection {
  category: Category;
  description: string;
  options: string[];
}

export interface Game {
  id: string;
  title: string;
  author?: string;
  connections: Connection[];
}

export type WordleDictionary = Record<string, string>;

export type CamnectionsDoc = Record<string, Game>;

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}
