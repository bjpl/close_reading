import { http, HttpResponse } from 'msw';
import { localDB } from './localDB';

export const handlers = [
  // Auth endpoints
  http.post('*/auth/v1/token', async ({ request }) => {
    const body = await request.json() as any;

    if (body.grant_type === 'password') {
      const { email, password } = body;
      const user = await localDB.authenticateUser(email as string, password as string);

      if (user) {
        return HttpResponse.json({
          access_token: `mock_token_${user.id}`,
          refresh_token: `mock_refresh_${user.id}`,
          expires_in: 3600,
          token_type: 'bearer',
          user: user,
        });
      }

      return HttpResponse.json(
        { error: 'Invalid credentials', error_description: 'Invalid login credentials' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ error: 'Unsupported grant type' }, { status: 400 });
  }),

  http.post('*/auth/v1/signup', async ({ request }) => {
    const body = await request.json() as any;
    const { email, password } = body;

    const user = await localDB.createUser(email as string, password as string);

    return HttpResponse.json({
      access_token: `mock_token_${user.id}`,
      refresh_token: `mock_refresh_${user.id}`,
      expires_in: 3600,
      token_type: 'bearer',
      user: user,
    });
  }),

  http.get('*/auth/v1/user', () => {
    const currentUser = localDB.getCurrentUser();

    if (currentUser) {
      return HttpResponse.json(currentUser);
    }

    return HttpResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }),

  http.post('*/auth/v1/logout', () => {
    localDB.clearCurrentUser();
    return HttpResponse.json({});
  }),

  // Database REST API endpoints
  http.get('*/rest/v1/documents', async () => {
    const userId = localDB.getCurrentUser()?.id;

    if (!userId) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documents = await localDB.getDocuments(userId);
    return HttpResponse.json(documents);
  }),

  http.post('*/rest/v1/documents', async ({ request }) => {
    const body = await request.json() as any;
    const userId = localDB.getCurrentUser()?.id;

    if (!userId) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await localDB.createDocument({
      ...body,
      user_id: userId,
    });

    return HttpResponse.json(document, { status: 201 });
  }),

  http.get('*/rest/v1/documents/:id', async ({ params }) => {
    const { id } = params;
    const document = await localDB.getDocument(id as string);

    if (!document) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(document);
  }),

  http.patch('*/rest/v1/documents', async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const body = await request.json() as any;

    if (!id) {
      return HttpResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const document = await localDB.updateDocument(id.replace('eq.', ''), body);
    return HttpResponse.json(document);
  }),

  http.delete('*/rest/v1/documents', async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return HttpResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await localDB.deleteDocument(id.replace('eq.', ''));
    return HttpResponse.json({});
  }),

  // Annotations endpoints
  http.get('*/rest/v1/annotations', async ({ request }) => {
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');

    if (!documentId) {
      return HttpResponse.json([]);
    }

    const annotations = await localDB.getAnnotations(documentId.replace('eq.', ''));
    return HttpResponse.json(annotations);
  }),

  http.post('*/rest/v1/annotations', async ({ request }) => {
    const body = await request.json() as any;
    const annotation = await localDB.createAnnotation(body);
    return HttpResponse.json(annotation, { status: 201 });
  }),

  http.patch('*/rest/v1/annotations', async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const body = await request.json() as any;

    if (!id) {
      return HttpResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const annotation = await localDB.updateAnnotation(id.replace('eq.', ''), body);
    return HttpResponse.json(annotation);
  }),

  http.delete('*/rest/v1/annotations', async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return HttpResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await localDB.deleteAnnotation(id.replace('eq.', ''));
    return HttpResponse.json({});
  }),

  // Projects endpoints
  http.get('*/rest/v1/projects', async () => {
    const userId = localDB.getCurrentUser()?.id;

    if (!userId) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await localDB.getProjects(userId);
    return HttpResponse.json(projects);
  }),

  http.post('*/rest/v1/projects', async ({ request }) => {
    const body = await request.json() as any;
    const userId = localDB.getCurrentUser()?.id;

    if (!userId) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await localDB.createProject({
      ...body,
      user_id: userId,
    });

    return HttpResponse.json(project, { status: 201 });
  }),

  // Paragraph links endpoints
  http.get('*/rest/v1/paragraph_links', async ({ request }) => {
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');

    if (!documentId) {
      return HttpResponse.json([]);
    }

    const links = await localDB.getParagraphLinks(documentId.replace('eq.', ''));
    return HttpResponse.json(links);
  }),

  http.post('*/rest/v1/paragraph_links', async ({ request }) => {
    const body = await request.json() as any;
    const link = await localDB.createParagraphLink(body);
    return HttpResponse.json(link, { status: 201 });
  }),
];
