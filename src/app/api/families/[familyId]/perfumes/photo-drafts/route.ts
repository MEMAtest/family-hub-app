import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const suggestionsFromText = (text: string) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length >= 2);
  const knownHouses = ['Kilian', 'Acqua di Parma', 'Dior', 'Chanel', 'Tom Ford', 'Creed', 'Byredo', 'Le Labo', 'Maison Francis Kurkdjian'];
  const house = knownHouses.find((candidate) => new RegExp(candidate.replace(/ /g, '\\s+'), 'i').test(text)) || lines[0] || null;
  const concentration = /(eau de parfum|eau de toilette|parfum|extrait)/i.exec(text)?.[0] || null;
  const name = lines.find((line) => line !== house && !/(eau de parfum|eau de toilette|parfum|ml|oz)/i.test(line)) || null;
  return { house, name, concentration };
};

export const GET = requireFamilyAccess(async (_request: NextRequest, _context, authUser) => {
  const drafts = await prisma.fragranceDraft.findMany({
    where: { personId: authUser.familyMemberId, confirmedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, suggestedHouse: true, suggestedName: true, suggestedConcentration: true, extractedText: true, createdAt: true },
  });
  return NextResponse.json(drafts);
});

export const POST = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Upload a photo of the fragrance bottle label.' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: 'Bottle photo must be 5MB or smaller.' }, { status: 400 });

    const data = Buffer.from(await file.arrayBuffer());
    let extractedText = '';
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const result = await worker.recognize(data);
      extractedText = result.data.text.trim();
      await worker.terminate();
    } catch (error) {
      console.warn('Fragrance label OCR failed:', error);
    }
    const suggestion = suggestionsFromText(extractedText);
    const draft = await prisma.fragranceDraft.create({
      data: {
        personId: authUser.familyMemberId,
        suggestedHouse: suggestion.house,
        suggestedName: suggestion.name,
        suggestedConcentration: suggestion.concentration,
        extractedText: extractedText || null,
        photoData: data,
        photoMimeType: file.type,
        photoSizeBytes: file.size,
      },
      select: { id: true, suggestedHouse: true, suggestedName: true, suggestedConcentration: true, extractedText: true, createdAt: true },
    });
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error('Create fragrance draft error:', error);
    return NextResponse.json({ error: 'Could not read that bottle photo.' }, { status: 500 });
  }
});
