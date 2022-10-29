import { asktugClient } from '../clients';
import { AxiosRequestConfig } from 'axios';
import { GetServerSidePropsContext } from 'next';

const asktugProdDomain = 'https://asktug.com';
const askTugApiDomain = process.env.NEXT_PUBLIC_ASKTUG_PROXY_BASE_URL ?? asktugProdDomain;
export const askTugDomain = process.env.NEXT_PUBLIC_ASKTUG_WEBSITE_BASE_URL ?? asktugProdDomain;
const accountsDomain = process.env.NEXT_PUBLIC_ACCOUNTS_BASE_URL ?? '';

export interface IRawBadges {
  id: number;
  name: string;
  description: string;
  grant_count: number;
  image_url: string;
  listable: boolean;
  enabled: boolean;
  has_badge: boolean;
  long_description: string;
}
export interface IBlogAuthor {
  id: number;
  username: string;
  avatarURL: string;
}

//export interface IBlogCategory {
//  id: number;
//  name: string;
//  slug: string;
//}

export interface IPost {
  id: number;
  slug: string;
  status: string;
  author: IBlogAuthor;
  origin: string;
  title: string;
  summary: string;
  publishedAt?: Date;
  createdAt: Date;
  lastModifiedAt: Date;
  deletedAt?: Date;
  recommended: boolean;
  recommendAt?: Date;
  tags: [];
  likes: number;
  comments: number;
}

export interface IPostFavorite {
  post: IPost;
  user: IBlogAuthor;
}

export interface IPage {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface IResponse<T> {
  content: T[];
  page: IPage;
}

function withAccountsCookies(config: AxiosRequestConfig, ssrCtx?: GetServerSidePropsContext) {
  if (!ssrCtx) {
    return config;
  }
  const cookies = ssrCtx.req.cookies;
  const headers = (config.headers = config.headers || {});

  if (headers.cookie) {
    headers.cookie += ';';
  } else {
    headers.cookie = '';
  }

  headers.cookie += ['ssid', 'dev_sid']
    .map((name) => [name, cookies[name]])
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join(';');

  return config;
}

async function getAllBadges(ssrCtx?: GetServerSidePropsContext): Promise<Map<IRawBadges['id'], IRawBadges>> {
  const result: { badges: any[] } = await asktugClient.get(
    `${askTugApiDomain}/badges.json`,
    withAccountsCookies(
      {
        fallbackResponse: { badges: [] },
      },
      ssrCtx
    )
  );
  const badgesMap = new Map<IRawBadges['id'], IRawBadges>();
  result.badges?.forEach((value) => badgesMap.set(value.id, { ...value, has_badge: false }));
  return badgesMap;
}

export async function getBadgesByUsername(
  input: { username: string },
  ssrCtx?: GetServerSidePropsContext
): Promise<IRawBadges[]> {
  const { username } = input;
  const badgesMap = await getAllBadges();
  const result: { badges: any[] } = await asktugClient.get(
    `${askTugApiDomain}/user-badges/${encodeURIComponent(username)}.json`,
    withAccountsCookies(
      {
        fallbackResponse: { badges: [] },
      },
      ssrCtx
    )
  );
  result.badges?.forEach((value) => badgesMap.set(value.id, { ...value, has_badge: true }));
  const badgesArr: IRawBadges[] = [];
  badgesMap.forEach((value) => badgesArr.push(value));
  return badgesArr;
}

export interface IProfile {
  username: string;
  avatar_url: string;
  bio: string;
  joined_at: string;
  level: number;
  points: number;
  exps: number;
  level_desc: {
    min_exps: number;
    max_exps: number;
    progress: number;
  };
  can_edit: boolean;
}

export async function getUserProfileByUsername(
  input: { username: string },
  ssrCtx?: GetServerSidePropsContext
): Promise<IProfile | null> {
  const { username } = input;
  const result: { data: IProfile } = await asktugClient.get(
    `${accountsDomain}/api/users/${encodeURIComponent(username)}`,
    withAccountsCookies({}, ssrCtx)
  );
  return result.data ?? null;
}

export enum EUserActionFilter {
  /*eslint-disable no-unused-vars*/
  LIKE = 1,
  WAS_LIKED = 2,
  BOOKMARK = 3,
  NEW_TOPIC = 4,
  REPLY = 5,
  RESPONSE = 6,
  MENTION = 7,
  QUOTE = 9,
  EDIT = 11,
  NEW_PRIVATE_MESSAGE = 12,
  GOT_PRIVATE_MESSAGE = 13,
  SOLVED = 15,
  ASSIGNED = 16,
  /*eslint-enable no-unused-vars*/
}

export interface IUserAction {
  topic_id: number;
  post_id: number;
  post_number: number;
  title: string;
  username: string;
  created_at: Date;
  excerpt: string;
}

export const getTopicUrl = (topic_id: number, post_number: number) =>
  `${askTugDomain}/t/topic/${topic_id}/${post_number}`;

export async function getAnswersByUsername(
  input: {
    username: string;
    markedSolution?: boolean;
    pageNumber?: number;
    pageSize?: number;
  },
  ssrCtx?: GetServerSidePropsContext
): Promise<IUserAction[]> {
  const { username, markedSolution = false, pageNumber = 1, pageSize = 10 } = input;
  const offset = (pageNumber - 1) * pageSize;
  const url = `${askTugApiDomain}/user_actions.json?offset=${offset}&username=${encodeURIComponent(username)}&filter=${
    markedSolution ? EUserActionFilter.SOLVED : EUserActionFilter.REPLY
  }`;
  try {
    const result: { user_actions: IUserAction[] } = await asktugClient.get(
      url,
      withAccountsCookies(
        {
          isReturnErrorResponse: true,
          fallbackResponse: { user_actions: [] },
        },
        ssrCtx
      )
    );
    return result.user_actions?.slice(0, pageSize - 1) ?? [];
  } catch (response) {
    if (response?.status && response.status === 404) {
      return [];
    } else {
      throw response?.data;
    }
  }
}

export async function getAskTugFavoritesByUsername(
  username: string,
  pageNumber = 1,
  pageSize = 10
): Promise<IUserAction[]> {
  const offset = (pageNumber - 1) * pageSize;
  const url = `${askTugApiDomain}/user_actions.json?offset=${offset}&username=${encodeURIComponent(username)}&filter=${
    EUserActionFilter.BOOKMARK
  }`;
  try {
    const result: { user_actions: IUserAction[] } = await asktugClient.get(url, {
      isReturnErrorResponse: true,
      fallbackResponse: { user_actions: [] },
    });
    return result.user_actions?.slice(0, pageSize - 1) ?? [];
  } catch (response) {
    if (response?.status && response.status === 404) {
      return [];
    } else {
      throw response?.data;
    }
  }
}

export interface IQuestions {
  id: number;
  topic_id: number;
  title: string;
  posts_count: number;
  reply_count: number;
  created_at: Date;
  views: number;
  like_count: number;
}

export enum ESolved {
  all = '',
  solved = 'solved',
  unsolved = 'unsolved',
}

export async function getQuestionsByUsername(
  input: {
    username: string;
    solved?: ESolved;
    page?: number;
    per_page?: number;
  },
  ssrCtx?: GetServerSidePropsContext
): Promise<IQuestions[]> {
  const { username, solved = ESolved.all, page = 1, per_page = 10 } = input;
  let data: IQuestions[];
  if (solved === ESolved.all) {
    const url = `${askTugApiDomain}/topics/created-by/${encodeURIComponent(username)}.json`;
    const params = { solved: 1, page: page - 1, per_page };
    const result: { topic_list?: { topics: IQuestions[] } } = await asktugClient.get(
      url,
      withAccountsCookies(
        {
          params,
          fallbackResponse: { topic_list: [] },
        },
        ssrCtx
      )
    );
    data = result.topic_list?.topics ?? [];
  } else {
    const url = `${askTugApiDomain}/user_actions.json`;
    const offset = (page - 1) * per_page;
    const params: any = { username, offset };
    if (solved === ESolved.solved) {
      params.filter = EUserActionFilter.SOLVED;
    } else if (solved === ESolved.unsolved) {
      params.unsolved = 1;
    }
    try {
      const result: { user_actions: IQuestions[] } = await asktugClient.get(url, {
        params,
        isReturnErrorResponse: true,
        fallbackResponse: { user_actions: [] },
      });
      data = result.user_actions ?? [];
    } catch (response) {
      if (response?.status && response.status === 404) {
        data = [];
      } else {
        throw response?.data;
      }
    }
  }
  return data;
}

export interface IProfileSummary {
  user_summary: {
    likes_given: number;
    likes_received: number;
    topics_entered: number;
    posts_read_count: number;
    days_visited: number;
    topic_count: number;
    post_count: number;
    time_read: number;
    bookmark_count: number;
  };
}

export async function getSummaryByUsername(
  input: { username: string },
  ssrCtx?: GetServerSidePropsContext
): Promise<IProfileSummary | null> {
  const { username } = input;
  const url = `${askTugApiDomain}/u/${encodeURIComponent(username)}/summary.json`;
  try {
    const result: IProfileSummary = await asktugClient.get(
      url,
      withAccountsCookies({ isReturnErrorResponse: true }, ssrCtx)
    );
    return result ?? null;
  } catch (response) {
    if (response?.status && response.status === 404) {
      return null;
    } else {
      throw response?.data;
    }
  }
}
