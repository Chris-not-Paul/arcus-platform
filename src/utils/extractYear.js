const extractYear = (dateValue) => {
  if (!dateValue) return null;

  const dateString = String(dateValue);

  const match = dateString.match(
    /\b(19|20)\d{2}\b/
  );

  return match ? Number(match[0]) : null;
};

export default extractYear;