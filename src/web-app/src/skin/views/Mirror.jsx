// @version 3.3.418
// TooLoo.ai - Mirror View Wrapper
// Wraps InternalMirror component for routing - Self-hosted code editor

import React from 'react';
import { InternalMirror } from '../../components/InternalMirror';

const Mirror = () => {
  return (
    <div className="h-full w-full overflow-hidden">
      <InternalMirror />
    </div>
  );
};

Mirror.displayName = 'Mirror';

export default Mirror;
