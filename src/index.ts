import { Hono } from 'hono';
import { generateText, LanguageModel } from 'ai';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import * as Cheerio from 'cheerio';

type Bindings = { OPENAI_API_KEY: string };
type Variables = {
	model: LanguageModel;
	openai: OpenAIProvider;
};

const app = new Hono<{
	Bindings: Bindings;
	Variables: Variables;
}>();

app.use('*', async (c, next) => {
	const openai = createOpenAI({ apiKey: c.env.OPENAI_API_KEY });
	const model = openai('gpt-4o');

	c.set('openai', openai);
	c.set('model', model);

	return next();
});

const getPage = async (url: string) => {
	const resp = await fetch(url);
	return await resp.text();
};

const parsePageContent = async (text: string) => {
	const $ = Cheerio.load(text);
	const title = $('title').text();
	const body = $('body').clone().find('script,style').remove().end().text();
	return { title, body };
};

app.get('/summarize', async (c) => {
	const url = c.req.query('url');
	if (!url) return c.text('url param is required', 400);

	const { title, body } = await parsePageContent(await getPage(url));

	const { text: summary } = await generateText({
		model: c.get('model'),
		prompt: body,
		system: 'Summarize the content of the provided page.',
	});

	return c.json({
		summary,
		title,
		url,
	});
});

export default app;
