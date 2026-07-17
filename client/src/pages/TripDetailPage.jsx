import { useParams } from 'react-router-dom';
import PagePlaceholder from './PagePlaceholder';

const TripDetailPage = () => {
  const { tripId } = useParams();

  return (
    <PagePlaceholder title={`Trip ${tripId}`} step="STEP 43" />
  );
};

export default TripDetailPage;
