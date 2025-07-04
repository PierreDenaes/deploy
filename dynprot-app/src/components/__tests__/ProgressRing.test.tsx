import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressRing from '../ProgressRing';

describe('ProgressRing Component', () => {
  it('renders progress ring with correct structure', () => {
    const { container } = render(
      <ProgressRing 
        progress={75} 
        size={100} 
        strokeWidth={8}
      />
    );
    
    // Check if the container is rendered
    const progressDiv = container.firstChild as HTMLElement;
    expect(progressDiv).toBeInTheDocument();
    expect(progressDiv).toHaveStyle('width: 100px');
    expect(progressDiv).toHaveStyle('height: 100px');
  });

  it('renders children content', () => {
    render(
      <ProgressRing progress={50} size={100}>
        <span>50%</span>
      </ProgressRing>
    );
    
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('applies custom colors correctly', () => {
    const { container } = render(
      <ProgressRing 
        progress={25} 
        size={100}
        color="red"
        bgColor="gray"
      />
    );
    
    const progressDiv = container.firstChild as HTMLElement;
    expect(progressDiv).toBeInTheDocument();
    
    // Check if SVG elements are rendered
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(2); // background and progress SVGs
  });

  it('handles zero progress correctly', () => {
    render(
      <ProgressRing progress={0} size={100}>
        <span>0%</span>
      </ProgressRing>
    );
    
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles 100% progress correctly', () => {
    render(
      <ProgressRing progress={100} size={100}>
        <span>100%</span>
      </ProgressRing>
    );
    
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ProgressRing 
        progress={50} 
        size={100}
        className="custom-progress-ring"
      />
    );
    
    const progressDiv = container.firstChild as HTMLElement;
    expect(progressDiv).toHaveClass('custom-progress-ring');
  });

  it('uses default size when not specified', () => {
    const { container } = render(<ProgressRing progress={50} />);
    
    const progressDiv = container.firstChild as HTMLElement;
    expect(progressDiv).toHaveStyle('width: 120px');
    expect(progressDiv).toHaveStyle('height: 120px');
  });
});