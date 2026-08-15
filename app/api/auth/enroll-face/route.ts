import { NextRequest, NextResponse } from 'next/server';
import { MockEmployees } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    const { employeeId, embeddings } = await req.json();

    if (!employeeId || !embeddings || !Array.isArray(embeddings) || embeddings.length === 0) {
      return NextResponse.json({ error: 'Missing employeeId or face embeddings' }, { status: 400 });
    }

    const employee = MockEmployees.getById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Average the embeddings to create a single master template
    // Usually embeddings are 128-d or 512-d arrays of numbers
    const numDimensions = embeddings[0].length;
    const masterEmbedding = new Array(numDimensions).fill(0);

    for (let i = 0; i < embeddings.length; i++) {
      for (let j = 0; j < numDimensions; j++) {
        masterEmbedding[j] += embeddings[i][j];
      }
    }

    // Normalize by dividing by the number of samples
    for (let j = 0; j < numDimensions; j++) {
      masterEmbedding[j] /= embeddings.length;
    }

    // Save the master embedding to the local database
    MockEmployees.update(employeeId, {
      face_verified: true,
      face_embedding: masterEmbedding,
    });

    return NextResponse.json({ message: 'Face enrolled successfully', success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
