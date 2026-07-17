import { useParams } from 'react-router-dom';
import PagePlaceholder from './PagePlaceholder';

const PaymentPage = () => {
  const { tripId } = useParams();

  return (
    <PagePlaceholder title={`Payment for Trip ${tripId}`} step="STEP 45" />
  );
};

export default PaymentPage;
