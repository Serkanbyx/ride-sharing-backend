import { useParams } from 'react-router-dom';
import PagePlaceholder from './PagePlaceholder';

const RateTripPage = () => {
  const { tripId } = useParams();

  return (
    <PagePlaceholder title={`Rate Trip ${tripId}`} step="STEP 46" />
  );
};

export default RateTripPage;
