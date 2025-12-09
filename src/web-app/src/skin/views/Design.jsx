// @version 3.3.415
// TooLoo.ai - Design View Wrapper
// Wraps DeSignStudio component for routing

import React from 'react';
import DeSignStudio from '../../components/DeSignStudio';

const Design = () => {
  return (
    <div className="h-full w-full overflow-hidden">
      <DeSignStudio />
    </div>
  );
};

Design.displayName = 'Design';

export default Design;
