-- 003: anonīmajiem nav nekādu tiesību uz privātajām tabulām
revoke all on public.car_private from anon;
revoke insert, update, delete on public.cars, public.car_images, public.settings from anon;
