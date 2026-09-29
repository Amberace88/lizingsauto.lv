import { CarEditor } from '@/components/admin/CarEditor';
export const metadata = { title: 'Labot auto' };
export default async function EditCar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CarEditor id={id} />;
}
